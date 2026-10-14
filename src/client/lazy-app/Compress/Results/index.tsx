import { h, Component, Fragment } from 'preact';

import * as style from './style.css';
import 'add-css:./style.css';
import 'shared/custom-els/loading-spinner';
import { SourceImage } from '../';
import prettyBytes from './pretty-bytes';
import { Arrow, DownloadIcon, LeafIcon, LockIcon } from 'client/lazy-app/icons';

interface Props {
  loading: boolean;
  source?: SourceImage;
  imageFile?: File;
  downloadUrl?: string;
  flipSide: boolean;
  typeLabel: string;
  /** Phones: a compact sticky bar showing 'before → after' and Download. */
  bar?: boolean;
}

interface State {
  showLoadingState: boolean;
}

const loadingReactionDelay = 500;

export default class Results extends Component<Props, State> {
  state: State = {
    showLoadingState: this.props.loading,
  };

  /** The timeout ID between entering the loading state, and changing UI */
  private loadingTimeoutId: number = 0;

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.loading && !this.props.loading) {
      // Just stopped loading
      clearTimeout(this.loadingTimeoutId);
      this.setState({ showLoadingState: false });
    } else if (!prevProps.loading && this.props.loading) {
      // Just started loading
      this.loadingTimeoutId = self.setTimeout(
        () => this.setState({ showLoadingState: true }),
        loadingReactionDelay,
      );
    }
  }

  render(
    { source, imageFile, downloadUrl, flipSide, typeLabel, bar }: Props,
    { showLoadingState }: State,
  ) {
    const prettySize = imageFile && prettyBytes(imageFile.size);
    const isOriginal = !source || !imageFile || source.file === imageFile;
    let diff;
    let percent;

    if (source && imageFile) {
      diff = imageFile.size / source.file.size;
      const absolutePercent = Math.round(Math.abs(diff) * 100);
      percent = diff > 1 ? absolutePercent - 100 : 100 - absolutePercent;
    }

    const kind = this.kindSentence(isOriginal, diff, percent);
    const popped = !isOriginal && !showLoadingState && !!diff && diff < 1;

    if (bar) {
      const before = source && prettyBytes(source.file.size);
      return (
        <div class={style.bar} aria-live="polite">
          <div class={style.barText}>
            <div class={style.barSizes}>
              {!isOriginal && before && (
                <Fragment>
                  <span class={style.barBefore}>
                    {before.value} {before.unit}
                  </span>
                  <svg
                    class={style.barArrow}
                    viewBox="0 0 24 24"
                    aria-label="to"
                    role="img"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Fragment>
              )}
              <span class={style.barAfter}>
                {prettySize ? `${prettySize.value} ${prettySize.unit}` : '…'}
              </span>
            </div>
            <p class={style.barVerdict}>
              {showLoadingState ? 'Making it smaller…' : kind}
            </p>
          </div>
          <a
            class={showLoadingState ? style.downloadDisable : style.download}
            href={downloadUrl}
            download={imageFile ? imageFile.name : ''}
            aria-disabled={showLoadingState ? 'true' : undefined}
          >
            <span class={style.downloadIcon}>
              <DownloadIcon />
            </span>
            <span class={style.downloadText}>Download</span>
            {showLoadingState && <loading-spinner />}
          </a>
        </div>
      );
    }

    return (
      <div
        class={`${style.results} ${isOriginal ? style.isOriginal : ''}`}
        aria-live="polite"
      >
        <div class={style.expandArrow}>
          <Arrow />
        </div>
        <div class={style.summary}>
          <span class={style.typeLabel}>{typeLabel}</span>
          <div class={style.sizeRow}>
            <div class={style.fileSize}>
              {prettySize ? (
                <Fragment>
                  {prettySize.value}{' '}
                  <span class={style.unit}>{prettySize.unit}</span>
                </Fragment>
              ) : (
                '…'
              )}
            </div>
            {popped && (
              <span class={style.leaf} key={downloadUrl}>
                <LeafIcon />
              </span>
            )}
          </div>
          {showLoadingState ? (
            <p class={style.verdict}>Making it smaller…</p>
          ) : (
            kind && <p class={style.verdict}>{kind}</p>
          )}
        </div>
        <p class={style.stays}>
          <LockIcon />
          Stays on your device
        </p>
        <a
          class={
            (showLoadingState ? style.downloadDisable : style.download) +
            (isOriginal || !flipSide ? ' ' + style.secondary : '')
          }
          href={downloadUrl}
          download={imageFile ? imageFile.name : ''}
          aria-disabled={showLoadingState ? 'true' : undefined}
        >
          <span class={style.downloadIcon}>
            <DownloadIcon />
          </span>
          <span class={style.downloadText}>Download</span>
          {showLoadingState && <loading-spinner />}
        </a>
      </div>
    );
  }

  private kindSentence(
    isOriginal: boolean,
    diff: number | undefined,
    percent: number | undefined,
  ): string {
    if (isOriginal || !diff) return '';
    if (!percent) return 'About the same size as the original';
    return diff < 1
      ? `${percent}% smaller`
      : `${percent}% bigger than the original`;
  }
}
