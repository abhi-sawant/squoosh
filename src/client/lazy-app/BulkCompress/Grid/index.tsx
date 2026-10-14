import { h, Component, Fragment } from 'preact';

import * as style from './style.css';
import 'add-css:./style.css';
import { BulkItem } from '..';
import prettyBytes from '../../Compress/Results/pretty-bytes';

interface GridProps {
  items: BulkItem[];
  onItemClick(index: number): void;
}

function formatBytes(bytes: number): string {
  const { value, unit } = prettyBytes(bytes);
  return `${value} ${unit}`;
}

interface ThumbProps {
  item: BulkItem;
  onClick(): void;
}

interface ThumbState {
  src?: string;
  failed: boolean;
}

class Thumbnail extends Component<ThumbProps, ThumbState> {
  state: ThumbState = {
    // Browsers render jpg/png/webp/gif/svg/avif natively; for the rest the
    // <img> errors and we fall back to a type badge.
    src: URL.createObjectURL(this.props.item.file),
    failed: false,
  };

  componentWillUnmount(): void {
    if (this.state.src) URL.revokeObjectURL(this.state.src);
  }

  private onError = () => {
    if (this.state.src) URL.revokeObjectURL(this.state.src);
    this.setState({ src: undefined, failed: true });
  };

  render({ item }: ThumbProps, { src, failed }: ThumbState) {
    const ext =
      item.file.name.split('.').pop()?.toUpperCase().slice(0, 4) || 'IMG';

    return (
      <div class={style.thumbImageWrap}>
        {!failed && src ? (
          <img
            class={style.thumbImage}
            src={src}
            onError={this.onError}
            alt=""
          />
        ) : (
          <div class={style.thumbFallback}>{ext}</div>
        )}
        {item.status === 'processing' && (
          <div class={style.thumbOverlay}>
            <span class={style.spin} aria-hidden="true" />
          </div>
        )}
      </div>
    );
  }
}

const checkIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const alertIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 7v6M12 17h.01" />
  </svg>
);

function StatusChip({ item }: { item: BulkItem }) {
  switch (item.status) {
    case 'pending':
      return <span class={style.chip}>Waiting</span>;
    case 'processing':
      return (
        <span class={`${style.chip} ${style.chipBusy}`}>
          <span class={style.spin} aria-hidden="true" />
          Converting
        </span>
      );
    case 'done': {
      const percent =
        item.resultSize !== undefined
          ? Math.round((1 - item.resultSize / item.file.size) * 100)
          : 0;
      return (
        <span class={`${style.chip} ${style.chipDone}`}>
          {checkIcon}
          {percent >= 0
            ? `Done, saved ${percent}%`
            : `Done, ${Math.abs(percent)}% bigger`}
        </span>
      );
    }
    case 'error':
      return (
        <span class={`${style.chip} ${style.chipError}`}>
          {alertIcon}
          Couldn't convert
        </span>
      );
  }
}

export default class Grid extends Component<GridProps> {
  render({ items, onItemClick }: GridProps) {
    return (
      <ul class={style.grid}>
        {items.map((item, index) => {
          let sizeLine;
          if (item.status === 'done' && item.resultSize !== undefined) {
            sizeLine = (
              <Fragment>
                {formatBytes(item.file.size)} to{' '}
                <strong class={style.newSize}>
                  {formatBytes(item.resultSize)}
                </strong>
              </Fragment>
            );
          } else {
            sizeLine = formatBytes(item.file.size);
          }

          return (
            <li class={style.card} key={index} data-status={item.status}>
              <button
                class={style.cardButton}
                onClick={() => onItemClick(index)}
                title="Open comparison"
                type="button"
              >
                <Thumbnail item={item} onClick={() => onItemClick(index)} />
                <div class={style.cardInfo}>
                  <div class={style.cardName} title={item.file.name}>
                    {item.file.name}
                  </div>
                  <div class={style.cardSize}>{sizeLine}</div>
                  <StatusChip item={item} />
                  {item.status === 'error' && item.error && (
                    <div class={style.why}>
                      {item.error.replace(/^\w*Error: /, '')}
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
}
