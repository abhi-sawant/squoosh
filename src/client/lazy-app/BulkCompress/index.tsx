import { h, Component } from 'preact';

import * as style from './style.css';
import 'add-css:./style.css';
import {
  EncoderState,
  EncoderOptions,
  ProcessorState,
  encoderMap,
  defaultProcessorState,
} from '../feature-meta';
// Type-only import: erased at runtime, so it does NOT statically pull in the
// Compress module. The component + pipeline functions are loaded dynamically
// (see compressModuleP) to keep Compress in its own lazy chunk, which the
// service worker precaches via `entry-data:client/lazy-app/Compress`.
import type { SourceImage, OutputType } from '../Compress';
import WorkerBridge from '../worker-bridge';
import type SnackBarElement from 'shared/custom-els/snack-bar';
import 'shared/custom-els/loading-spinner';
// Reuse the single-image options panel (with `bulk` restrictions) so the
// config UI looks identical to the single-image flow.
import Options from '../Compress/Options';
import Grid from './Grid';
import prettyBytes from '../Compress/Results/pretty-bytes';

function formatBytes(bytes: number): string {
  const { value, unit } = prettyBytes(bytes);
  return `${value} ${unit}`;
}

export type BulkStatus = 'pending' | 'processing' | 'done' | 'error';

export interface BulkItem {
  file: File;
  status: BulkStatus;
  resultFile?: File;
  resultSize?: number;
  downloadUrl?: string;
  error?: string;
}

interface Props {
  files: File[];
  showSnack: SnackBarElement['showSnackbar'];
  onBack: () => void;
}

interface State {
  items: BulkItem[];
  encoderState: EncoderState;
  /** Shared processor config across all images. resize.width/height are unused
   * in bulk; the per-image dimensions are derived from `resizeScale`. */
  processorState: ProcessorState;
  /** Resize scale as a percentage (1–100), applied to each image's own size. */
  resizeScale: number;
  converting: boolean;
  zipping: boolean;
  modalIndex?: number;
  Compress?: typeof import('../Compress').default;
}

function dedupeName(name: string, used: Set<string>): string {
  if (!used.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot === -1 ? name : name.slice(0, dot);
  const ext = dot === -1 ? '' : name.slice(dot);
  let n = 1;
  while (used.has(`${base}-${n}${ext}`)) n += 1;
  return `${base}-${n}${ext}`;
}

const noop = () => {};

export default class BulkCompress extends Component<Props, State> {
  state: State = {
    items: this.props.files.map((file) => ({ file, status: 'pending' })),
    encoderState: {
      type: 'mozJPEG',
      options: encoderMap.mozJPEG.meta.defaultOptions,
    },
    processorState: defaultProcessorState,
    resizeScale: 50,
    converting: false,
    zipping: false,
    modalIndex: undefined,
  };

  /** A single worker bridge is enough since we convert one file at a time. */
  private readonly workerBridge = new WorkerBridge();
  private abortController = new AbortController();
  /** Lazily-loaded Compress module (component + pipeline functions). */
  private readonly compressModuleP = import('../Compress');

  constructor(props: Props) {
    super(props);
    this.compressModuleP.then((module) =>
      this.setState({ Compress: module.default }),
    );
  }

  private closeButton?: HTMLButtonElement | null;
  private modalOpener?: Element | null;

  componentDidMount(): void {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate(_prevProps: Props, prevState: State): void {
    // Move focus into the comparison modal when it opens.
    if (
      prevState.modalIndex === undefined &&
      this.state.modalIndex !== undefined
    ) {
      this.closeButton?.focus();
    }
  }

  componentWillUnmount(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    this.abortController.abort();
    for (const item of this.state.items) {
      if (item.downloadUrl) URL.revokeObjectURL(item.downloadUrl);
    }
  }

  private updateItem(index: number, partial: Partial<BulkItem>): void {
    this.setState((state) => ({
      items: state.items.map((item, i) =>
        i === index ? { ...item, ...partial } : item,
      ),
    }));
  }

  private onEncoderTypeChange = (_index: 0 | 1, newType: OutputType): void => {
    // Bulk always encodes (the "Original Image" option is hidden), so newType
    // is always a real encoder.
    if (newType === 'identity') return;
    this.setState({
      encoderState: {
        type: newType,
        options: encoderMap[newType].meta.defaultOptions,
      } as EncoderState,
    });
  };

  private onEncoderOptionsChange = (
    _index: 0 | 1,
    options: EncoderOptions,
  ): void => {
    this.setState((state) => ({
      encoderState: { type: state.encoderState.type, options } as EncoderState,
    }));
  };

  private onProcessorOptionsChange = (
    _index: 0 | 1,
    processorState: ProcessorState,
  ): void => {
    this.setState({ processorState });
  };

  private onResizeScaleChange = (scale: number): void => {
    this.setState({ resizeScale: scale });
  };

  /**
   * Convert every file, one at a time, updating each item's status as we go.
   * This is the only place (besides the comparison modal) where work happens —
   * config changes never trigger encoding.
   */
  private onConvert = async (): Promise<void> => {
    if (this.state.converting) return;

    this.abortController.abort();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const workerBridge = this.workerBridge;
    const { encoderState, processorState, resizeScale } = this.state;
    const scale = resizeScale / 100;

    this.setState({ converting: true });

    const { decodeImage, processImage, compressImage } = await this
      .compressModuleP;

    for (let i = 0; i < this.props.files.length; i += 1) {
      if (signal.aborted) return;
      const file = this.props.files[i];

      // Ditch any previous result for this item.
      const prevUrl = this.state.items[i].downloadUrl;
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      this.updateItem(i, {
        status: 'processing',
        error: undefined,
        resultFile: undefined,
        resultSize: undefined,
        downloadUrl: undefined,
      });

      try {
        const decoded = await decodeImage(signal, file, workerBridge);

        // Build a per-image processor state: resize dimensions come from this
        // image's own size × the shared scale, so aspect ratios are preserved.
        const itemProcessorState: ProcessorState = {
          quantize: processorState.quantize,
          resize: processorState.resize.enabled
            ? {
                enabled: true,
                width: Math.round(decoded.width * scale),
                height: Math.round(decoded.height * scale),
                method: 'lanczos3',
                fitMethod: 'stretch',
                premultiply: true,
                linearRGB: true,
              }
            : { ...defaultProcessorState.resize },
        };

        const source: SourceImage = {
          file,
          decoded,
          preprocessed: decoded,
        };

        const processed = await processImage(
          signal,
          source,
          itemProcessorState,
          workerBridge,
        );
        const resultFile = await compressImage(
          signal,
          processed,
          encoderState,
          file.name,
          workerBridge,
        );

        if (signal.aborted) return;

        this.updateItem(i, {
          status: 'done',
          resultFile,
          resultSize: resultFile.size,
          downloadUrl: URL.createObjectURL(resultFile),
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        this.updateItem(i, { status: 'error', error: String(err) });
      }
    }

    this.setState({ converting: false });
  };

  private onDownloadZip = async (): Promise<void> => {
    const done = this.state.items.filter(
      (item) => item.status === 'done' && item.resultFile,
    );
    if (done.length === 0) return;

    this.setState({ zipping: true });
    try {
      // Use the prebuilt browser bundle: the package main entry pulls in Node
      // built-ins (stream/buffer/util) that don't resolve in the browser.
      const { default: JSZip } = await import('jszip/dist/jszip.min.js');
      const zip = new JSZip();
      const used = new Set<string>();

      for (const item of done) {
        const name = dedupeName(item.resultFile!.name, used);
        used.add(name);
        zip.file(name, item.resultFile!);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'squoosh.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.props.showSnack(`Couldn't create zip: ${err}`);
    } finally {
      this.setState({ zipping: false });
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.state.modalIndex !== undefined) {
      this.closeModal();
    }
  };

  private openModal = (index: number): void => {
    this.modalOpener = document.activeElement;
    this.setState({ modalIndex: index });
  };

  private closeModal = (): void => {
    this.setState({ modalIndex: undefined });
    const opener = this.modalOpener as HTMLElement | null | undefined;
    this.modalOpener = undefined;
    opener?.focus?.();
  };

  render(
    { onBack, showSnack }: Props,
    {
      items,
      encoderState,
      processorState,
      resizeScale,
      converting,
      zipping,
      modalIndex,
      Compress,
    }: State,
  ) {
    const total = items.length;
    const doneCount = items.filter((item) => item.status === 'done').length;
    const failedCount = items.filter((item) => item.status === 'error').length;
    const finishedCount = doneCount + failedCount;
    const savedBytes = items.reduce(
      (sum, item) =>
        item.status === 'done' && item.resultSize !== undefined
          ? sum + (item.file.size - item.resultSize)
          : sum,
      0,
    );
    const pictures = total === 1 ? 'picture' : 'pictures';

    let progressText: string;
    if (converting) {
      progressText = `Converting ${Math.min(
        finishedCount + 1,
        total,
      )} of ${total}`;
    } else if (finishedCount === 0) {
      progressText = `Ready to convert ${total} ${pictures}`;
    } else {
      progressText = `${finishedCount} of ${total} done`;
    }

    let savedText: string;
    if (doneCount === 0) savedText = 'Nothing saved yet';
    else if (savedBytes > 0) {
      savedText = `You've saved ${formatBytes(savedBytes)} so far`;
    } else savedText = 'These came out a little bigger than the originals';

    return (
      <div class={style.bulk}>
        <header class={style.header}>
          <button class={style.back} onClick={onBack} type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Back
          </button>
          <div>
            <h1 class={style.heading}>Bulk convert</h1>
            <p class={style.subHeading}>
              {total} {pictures}, {doneCount} done
            </p>
          </div>
        </header>

        <div class={style.layout}>
          <section class={style.gridArea} aria-label="Your pictures">
            <Grid items={items} onItemClick={this.openModal} />
          </section>

          <aside class={style.panel} aria-label="Settings for all pictures">
            <div class={style.settings}>
              <Options
                index={1}
                mobileView={false}
                source={undefined}
                encoderState={encoderState}
                processorState={processorState}
                bulk
                resizeScale={resizeScale}
                onResizeScaleChange={this.onResizeScaleChange}
                onEncoderTypeChange={this.onEncoderTypeChange}
                onEncoderOptionsChange={this.onEncoderOptionsChange}
                onProcessorOptionsChange={this.onProcessorOptionsChange}
                onCopyToOtherSideClick={noop}
                onSaveSideSettingsClick={noop}
                onImportSideSettingsClick={noop}
              />
            </div>
            <div class={style.actions}>
              <div class={style.progress}>
                <p class={style.progressText} aria-live="polite">
                  {progressText}
                </p>
                <div
                  class={style.track}
                  role="progressbar"
                  aria-label="Conversion progress"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={finishedCount}
                >
                  <div
                    class={style.trackFill}
                    style={{
                      width: `${total ? (finishedCount / total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p class={style.saved}>{savedText}</p>
              </div>
              <div class={style.buttons}>
                <button
                  class={style.primary}
                  type="button"
                  onClick={this.onConvert}
                  disabled={converting}
                  aria-busy={converting}
                >
                  {converting ? (
                    <span class={style.spin} aria-hidden="true" />
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" />
                    </svg>
                  )}
                  {converting ? 'Converting…' : 'Convert all'}
                </button>
                <button
                  class={style.secondary}
                  type="button"
                  onClick={this.onDownloadZip}
                  disabled={converting || zipping || doneCount === 0}
                  aria-busy={zipping}
                >
                  {zipping ? (
                    <span class={style.spin} aria-hidden="true" />
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                    </svg>
                  )}
                  {zipping ? 'Making your ZIP…' : 'Download all as ZIP'}
                </button>
              </div>
            </div>
          </aside>
        </div>

        {modalIndex !== undefined && Compress && (
          <div class={style.modal}>
            <div
              class={style.modalSheet}
              role="dialog"
              aria-modal="true"
              aria-label={`Compare ${items[modalIndex].file.name}`}
            >
              <button
                class={style.modalClose}
                aria-label="Close comparison"
                type="button"
                onClick={this.closeModal}
                ref={(el) => (this.closeButton = el)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <div class={style.modalInner}>
                <Compress
                  key={items[modalIndex].file.name + modalIndex}
                  file={items[modalIndex].file}
                  showSnack={showSnack}
                  onBack={this.closeModal}
                  initialSettings={{
                    encoderState,
                    quantize: processorState.quantize,
                    resizeScale: processorState.resize.enabled
                      ? resizeScale / 100
                      : undefined,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
