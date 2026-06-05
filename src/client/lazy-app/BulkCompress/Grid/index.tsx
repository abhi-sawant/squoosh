import { h, Component, Fragment } from 'preact';

import * as style from './style.css';
import 'add-css:./style.css';
import 'shared/custom-els/loading-spinner';
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
            <loading-spinner />
          </div>
        )}
      </div>
    );
  }
}

function StatusBadge({ item }: { item: BulkItem }) {
  switch (item.status) {
    case 'pending':
      return (
        <span class={`${style.badge} ${style.badgePending}`}>Pending</span>
      );
    case 'processing':
      return (
        <span class={`${style.badge} ${style.badgeProcessing}`}>
          Converting…
        </span>
      );
    case 'done':
      return <span class={`${style.badge} ${style.badgeDone}`}>✓ Done</span>;
    case 'error':
      return (
        <span class={`${style.badge} ${style.badgeError}`} title={item.error}>
          ✕ Failed
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
            const ratio = item.resultSize / item.file.size;
            const percent = Math.round((1 - ratio) * 100);
            sizeLine = (
              <Fragment>
                {formatBytes(item.file.size)} → {formatBytes(item.resultSize)}{' '}
                <span class={percent >= 0 ? style.savingDown : style.savingUp}>
                  ({percent >= 0 ? '↓' : '↑'}
                  {Math.abs(percent)}%)
                </span>
              </Fragment>
            );
          } else {
            sizeLine = formatBytes(item.file.size);
          }

          return (
            <li class={style.card} key={index}>
              <button
                class={style.cardButton}
                onClick={() => onItemClick(index)}
                title="Open comparison"
              >
                <Thumbnail item={item} onClick={() => onItemClick(index)} />
                <div class={style.cardInfo}>
                  <div class={style.cardName} title={item.file.name}>
                    {item.file.name}
                  </div>
                  <div class={style.cardSize}>{sizeLine}</div>
                  <StatusBadge item={item} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
}
