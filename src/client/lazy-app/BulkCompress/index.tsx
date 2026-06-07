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
import { ConvertIcon, DownloadIcon } from 'client/lazy-app/icons';
import Grid from './Grid';

// The decorative blob backdrop shared by the convert/download FABs — same
// shape as the single-image editor's download button.
const FabBlobs = () => (
  <svg class={style.fabBlobs} viewBox="0 0 89.6 86.9">
    <path d="M27.3 72c-8-4-15.6-12.3-16.9-21-1.2-8.7 4-17.8 10.5-26s14.4-15.6 24-16 21.2 6 28.6 16.5c7.4 10.5 10.8 25 6.6 34S64.1 71.8 54 73.6c-10.2 2-18.7 2.3-26.7-1.6z" />
    <path d="M19.8 24.8c4.3-7.8 13-15 21.8-15.7 8.7-.8 17.5 4.8 25.4 11.8 7.8 6.9 14.8 15.2 14.7 24.9s-7.1 20.7-18 27.6c-10.8 6.8-25.5 9.5-34.2 4.8S18.1 61.6 16.7 51.4c-1.3-10.3-1.3-18.8 3-26.6z" />
  </svg>
);

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

  componentWillUnmount(): void {
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

  private openModal = (index: number): void => {
    this.setState({ modalIndex: index });
  };

  private closeModal = (): void => {
    this.setState({ modalIndex: undefined });
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
    const doneCount = items.filter((item) => item.status === 'done').length;

    return (
      <div class={style.bulk}>
        <button class={style.back} onClick={onBack}>
          <svg viewBox="0 0 61 53.3">
            <title>Back</title>
            <path
              class={style.backBlob}
              d="M0 25.6c-.5-7.1 4.1-14.5 10-19.1S23.4.1 32.2 0c8.8 0 19 1.6 24.4 8s5.6 17.8 1.7 27a29.7 29.7 0 01-20.5 18c-8.4 1.5-17.3-2.6-24.5-8S.5 32.6.1 25.6z"
            />
            <path
              class={style.backX}
              d="M41.6 17.1l-2-2.1-8.3 8.2-8.2-8.2-2 2 8.2 8.3-8.3 8.2 2.1 2 8.2-8.1 8.3 8.2 2-2-8.2-8.3z"
            />
          </svg>
        </button>

        <div class={style.gridArea}>
          <h1 class={style.heading}>
            Bulk convert
            <span class={style.subHeading}>
              {items.length} images · {doneCount} converted
            </span>
          </h1>
          <Grid items={items} onItemClick={this.openModal} />
        </div>

        <div class={style.optionsArea}>
          <div class={style.optionsTheme}>
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
            <button
              class={converting ? style.fabBusy : style.fab}
              title="Convert all"
              onClick={this.onConvert}
              disabled={converting}
            >
              <FabBlobs />
              <div class={style.fabIcon}>
                <ConvertIcon />
              </div>
              {converting && <loading-spinner />}
            </button>
            <button
              class={zipping ? style.fabBusy : style.fab}
              title="Download all (ZIP)"
              onClick={this.onDownloadZip}
              disabled={converting || zipping || doneCount === 0}
            >
              <FabBlobs />
              <div class={style.fabIcon}>
                <DownloadIcon />
              </div>
              {zipping && <loading-spinner />}
            </button>
          </div>
        </div>

        {modalIndex !== undefined && Compress && (
          <div class={style.modal}>
            <button
              class={style.modalClose}
              title="Close"
              onClick={this.closeModal}
            >
              ✕
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
        )}
      </div>
    );
  }
}
