import { h, Component, Fragment } from 'preact';

import * as style from './style.css';
import 'add-css:./style.css';
import { cleanSet, cleanMerge } from '../../util/clean-modify';

import type { SourceImage, OutputType } from '..';
import {
  EncoderOptions,
  EncoderState,
  ProcessorState,
  ProcessorOptions,
  encoderMap,
} from '../../feature-meta';
import Expander from './Expander';
import Toggle from './Toggle';
import Select from './Select';
import Range from './Range';
import { Options as QuantOptionsComponent } from 'features/processors/quantize/client';
import { Options as ResizeOptionsComponent } from 'features/processors/resize/client';
import { ImportIcon, SaveIcon, SwapIcon } from 'client/lazy-app/icons';

type EncoderType = keyof typeof encoderMap;

interface QualityConfig {
  min: number;
  max: number;
  step: number;
  /** Smallest, Balanced, Best quality (in the encoder's own quality scale). */
  presets: [number, number, number];
  /** True when the encoder is in a lossless mode (no quality to adjust). */
  isLossless?(options: any): boolean;
  /** Extra option changes that must accompany a quality change. */
  extra?(oldOptions: any, quality: number): object;
}

const presetLabels = ['Smallest', 'Balanced', 'Best quality'];

const qualityConfigs: Partial<Record<EncoderType, QualityConfig>> = {
  mozJPEG: { min: 0, max: 100, step: 1, presets: [40, 75, 90] },
  webP: {
    min: 0,
    max: 100,
    step: 0.1,
    presets: [50, 75, 92],
    isLossless: (o) => !!o.lossless,
  },
  // AVIF quality: 0 worst, 100 lossless (capped to 99 here).
  avif: {
    min: 0,
    max: 99,
    step: 1,
    presets: [30, 50, 70],
    isLossless: (o) => o.quality === 100 && o.subsample === 3,
  },
  jxl: {
    min: 0,
    max: 99.9,
    step: 0.1,
    presets: [50, 75, 90],
    isLossless: (o) => o.quality >= 100,
  },
  wp2: {
    min: 0,
    max: 95,
    step: 0.1,
    presets: [50, 75, 90],
    isLossless: (o) => o.quality > 95,
    // Keep alpha quality following quality unless it was set separately.
    extra: (o, quality) =>
      o.alpha_quality === o.quality ? { alpha_quality: quality } : {},
  },
  browserJPEG: { min: 0, max: 1, step: 0.01, presets: [0.4, 0.75, 0.92] },
};

/** Encoders whose whole options panel is just the quality slider. */
const qualityOnlyEncoders: EncoderType[] = ['browserJPEG'];

const formatHints: Record<string, string> = {
  identity: 'Untouched. Nothing is changed in your picture.',
  mozJPEG: 'Great for photos, opens everywhere.',
  webP: 'Small files, works in all modern browsers.',
  oxiPNG: 'Lossless: sharp graphics and screenshots.',
  avif: 'Smallest files, but only newer browsers can open them.',
  jxl: 'A new format, still in beta. Few apps open it yet.',
  qoi: 'A simple lossless format, mostly for games and tools.',
  wp2: 'An experimental format. Most apps cannot open it yet.',
  browserPNG: 'Made by your browser. Lossless and widely supported.',
  browserJPEG: 'Made by your browser. Opens everywhere.',
  browserGIF: 'Made by your browser. Up to 256 colours.',
};

interface Props {
  index: 0 | 1;
  mobileView: boolean;
  source?: SourceImage;
  encoderState?: EncoderState;
  processorState: ProcessorState;
  onEncoderTypeChange(index: 0 | 1, newType: OutputType): void;
  onEncoderOptionsChange(index: 0 | 1, newOptions: EncoderOptions): void;
  onProcessorOptionsChange(index: 0 | 1, newOptions: ProcessorState): void;
  onCopyToOtherSideClick(index: 0 | 1): void;
  onSaveSideSettingsClick(index: 0 | 1): void;
  onImportSideSettingsClick(index: 0 | 1): void;
  /**
   * Bulk mode: a single shared config across many images. Hides the
   * per-side copy/save/import buttons and the "Original Image" option, and
   * swaps the full resize controls (preset/width/height) for a single
   * percentage scale, since images have differing aspect ratios.
   */
  bulk?: boolean;
  /** Bulk resize scale as a percentage (1–100); only used when `bulk`. */
  resizeScale?: number;
  onResizeScaleChange?(scale: number): void;
}

interface State {
  supportedEncoderMap?: PartialButNotUndefined<typeof encoderMap>;
  leftSideSettings?: string | null;
  rightSideSettings?: string | null;
}

type PartialButNotUndefined<T> = {
  [P in keyof T]: T[P];
};

const supportedEncoderMapP: Promise<PartialButNotUndefined<typeof encoderMap>> =
  (async () => {
    const supportedEncoderMap: PartialButNotUndefined<typeof encoderMap> = {
      ...encoderMap,
    };

    // Filter out entries where the feature test fails
    await Promise.all(
      Object.entries(encoderMap).map(async ([encoderName, details]) => {
        if ('featureTest' in details && !(await details.featureTest())) {
          delete supportedEncoderMap[encoderName as keyof typeof encoderMap];
        }
      }),
    );

    return supportedEncoderMap;
  })();

export default class Options extends Component<Props, State> {
  state: State = {
    supportedEncoderMap: undefined,
    leftSideSettings: localStorage.getItem('leftSideSettings'),
    rightSideSettings: localStorage.getItem('rightSideSettings'),
  };

  constructor() {
    super();
    supportedEncoderMapP.then((supportedEncoderMap) =>
      this.setState({ supportedEncoderMap }),
    );
  }

  private setLeftSideSettings = () => {
    this.setState({
      leftSideSettings: localStorage.getItem('leftSideSettings'),
    });
  };

  private setRightSideSettings = () => {
    this.setState({
      rightSideSettings: localStorage.getItem('rightSideSettings'),
    });
  };

  componentDidMount(): void {
    // Changing the state when side setting is stored in localstorage
    window.addEventListener('leftSideSettings', this.setLeftSideSettings);
    window.addEventListener('rightSideSettings', this.setRightSideSettings);
  }

  componentWillUnmount(): void {
    window.removeEventListener('leftSideSettings', this.setLeftSideSettings);
    window.removeEventListener('removeSideSettings', this.setRightSideSettings);
  }

  private onEncoderTypeChange = (event: Event) => {
    const el = event.currentTarget as HTMLSelectElement;

    // The select element only has values matching encoder types,
    // so 'as' is safe here.
    const type = el.value as OutputType;
    this.props.onEncoderTypeChange(this.props.index, type);
  };

  private onProcessorEnabledChange = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const processor = el.name.split('.')[0] as keyof ProcessorState;

    this.props.onProcessorOptionsChange(
      this.props.index,
      cleanSet(this.props.processorState, `${processor}.enabled`, el.checked),
    );
  };

  private onQuantizerOptionsChange = (opts: ProcessorOptions['quantize']) => {
    this.props.onProcessorOptionsChange(
      this.props.index,
      cleanMerge(this.props.processorState, 'quantize', opts),
    );
  };

  private onResizeOptionsChange = (opts: ProcessorOptions['resize']) => {
    this.props.onProcessorOptionsChange(
      this.props.index,
      cleanMerge(this.props.processorState, 'resize', opts),
    );
  };

  private onEncoderOptionsChange = (newOptions: EncoderOptions) => {
    this.props.onEncoderOptionsChange(this.props.index, newOptions);
  };

  private onScaleInput = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    let percent = Number(el.value);
    if (!Number.isFinite(percent)) return;
    percent = Math.min(100, Math.max(1, percent));
    this.props.onResizeScaleChange?.(percent);
  };

  private setQuality(quality: number) {
    const { encoderState } = this.props;
    if (!encoderState) return;
    const config = qualityConfigs[encoderState.type];
    if (!config) return;
    const options = encoderState.options as any;
    let newOptions = cleanSet(options, 'quality', quality);
    if (config.extra) {
      for (const [key, value] of Object.entries(
        config.extra(options, quality),
      )) {
        newOptions = cleanSet(newOptions, key, value);
      }
    }
    this.onEncoderOptionsChange(newOptions);
  }

  private onQualityInput = (event: Event) => {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (Number.isFinite(value)) this.setQuality(value);
  };

  private onPresetChange = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement;
    const { encoderState } = this.props;
    const config = encoderState && qualityConfigs[encoderState.type];
    if (!config) return;
    this.setQuality(config.presets[Number(el.value)]);
  };

  private onCopyToOtherSideClick = () => {
    this.props.onCopyToOtherSideClick(this.props.index);
  };

  private onSaveSideSettingClick = () => {
    this.props.onSaveSideSettingsClick(this.props.index);
  };

  private onImportSideSettingsClick = () => {
    this.props.onImportSideSettingsClick(this.props.index);
  };

  render(
    { source, encoderState, processorState, bulk, resizeScale, index }: Props,
    { supportedEncoderMap, leftSideSettings, rightSideSettings }: State,
  ) {
    const encoder = encoderState && encoderMap[encoderState.type];
    const EncoderOptionComponent =
      encoder && 'Options' in encoder ? encoder.Options : undefined;
    const qualityConfig = encoderState && qualityConfigs[encoderState.type];
    const hasMoreSettings =
      !!EncoderOptionComponent &&
      !qualityOnlyEncoders.includes(encoderState!.type);
    const typeKey = encoderState ? encoderState.type : 'identity';

    let quality = 0;
    let lossless = false;
    let activePreset = -1;
    if (encoderState && qualityConfig) {
      const options = encoderState.options as any;
      quality = options.quality;
      lossless = !!qualityConfig.isLossless?.(options);
      activePreset = qualityConfig.presets.findIndex(
        (preset) => Math.abs(preset - quality) < qualityConfig.step / 2 + 1e-9,
      );
    }

    const settingsMissing =
      index === 0 ? !leftSideSettings : !rightSideSettings;

    return (
      <div
        class={
          style.optionsScroller +
          ' ' +
          (encoderState ? '' : style.originalImage)
        }
      >
        <h3 class={style.optionsTitle}>
          <div class={style.titleAndButtons}>
            <span class={style.titleText}>How should we save it?</span>
          </div>
        </h3>

        <section class={style.saveAs}>
          <label class={style.fieldLabel} for={`save-as-${index}`}>
            Save as
          </label>
          {supportedEncoderMap ? (
            <Select
              id={`save-as-${index}`}
              value={typeKey}
              onChange={this.onEncoderTypeChange}
              large
            >
              {!bulk && (
                <option value="identity">{`Original Image ${
                  this.props.source ? `(${this.props.source.file.name})` : ''
                }`}</option>
              )}
              {Object.entries(supportedEncoderMap).map(([type, encoder]) => (
                <option value={type}>{encoder.meta.label}</option>
              ))}
            </Select>
          ) : (
            <Select id={`save-as-${index}`} large>
              <option>Loading…</option>
            </Select>
          )}
          <p class={style.formatHint} aria-live="polite">
            {formatHints[typeKey]}
          </p>
        </section>

        {encoderState && qualityConfig && !lossless && (
          <Fragment>
            <div class={style.presetWrap}>
              <fieldset class={style.presetGroup}>
                <legend class={style.presetLegend}>
                  Choose how small to make it
                </legend>
                {presetLabels.map((label, i) => (
                  <label class={style.presetItem}>
                    <input
                      class={style.presetInput}
                      type="radio"
                      name={`preset-${index}`}
                      value={i}
                      checked={activePreset === i}
                      onChange={this.onPresetChange}
                    />
                    <span class={style.presetFace}>{label}</span>
                  </label>
                ))}
              </fieldset>
              <p class={style.customNote} aria-live="polite">
                {activePreset === -1
                  ? 'Custom: set with the slider below.'
                  : ''}
              </p>
            </div>
            <div class={style.qualityBlock}>
              <Range
                name="quality"
                min={qualityConfig.min}
                max={qualityConfig.max}
                step={qualityConfig.step}
                value={quality}
                onInput={this.onQualityInput}
              >
                Quality
              </Range>
            </div>
          </Fragment>
        )}
        {encoderState && qualityConfig && lossless && (
          <p class={style.losslessNote}>
            This keeps every pixel exactly, so there is no quality to adjust.
          </p>
        )}

        {encoderState && (
          <div class={style.softOptions}>
            <label class={style.sectionEnabler}>
              Make it smaller in size
              <Toggle
                name="resize.enable"
                role="switch"
                checked={!!processorState.resize.enabled}
                onChange={this.onProcessorEnabledChange}
              />
            </label>
            <Expander>
              {processorState.resize.enabled ? (
                bulk ? (
                  <div class={style.optionOneCell}>
                    <label class={style.optionTextFirst}>
                      Scale
                      <span class={style.scaleField}>
                        <input
                          type="number"
                          class={style.textField}
                          min={1}
                          max={100}
                          step={1}
                          value={resizeScale}
                          onInput={this.onScaleInput}
                        />
                        %
                      </span>
                    </label>
                  </div>
                ) : (
                  <ResizeOptionsComponent
                    isVector={Boolean(source && source.vectorImage)}
                    inputWidth={source ? source.preprocessed.width : 1}
                    inputHeight={source ? source.preprocessed.height : 1}
                    options={processorState.resize}
                    onChange={this.onResizeOptionsChange}
                  />
                )
              ) : null}
            </Expander>

            <label class={style.sectionEnabler}>
              Use fewer colours
              <Toggle
                name="quantize.enable"
                role="switch"
                checked={!!processorState.quantize.enabled}
                onChange={this.onProcessorEnabledChange}
              />
            </label>
            <Expander>
              {processorState.quantize.enabled ? (
                <QuantOptionsComponent
                  options={processorState.quantize}
                  onChange={this.onQuantizerOptionsChange}
                />
              ) : null}
            </Expander>
          </div>
        )}

        {hasMoreSettings && (
          <div class={style.moreBody}>
            <EncoderOptionComponent
              options={
                // Casting options, as encoderOptionsComponentMap[encodeData.type] ensures
                // the correct type, but typescript isn't smart enough.
                encoderState!.options as any
              }
              onChange={this.onEncoderOptionsChange}
            />
          </div>
        )}
      </div>
    );
  }
}
