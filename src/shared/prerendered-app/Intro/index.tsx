import { h, Component } from 'preact';

import { linkRef } from 'shared/prerendered-app/util';
import '../../custom-els/loading-spinner';
import logo from 'url:./imgs/logo.svg';
import largePhoto from 'url:./imgs/demos/demo-large-photo.jpg';
import artwork from 'url:./imgs/demos/demo-artwork.jpg';
import deviceScreen from 'url:./imgs/demos/demo-device-screen.png';
import largePhotoIcon from 'url:./imgs/demos/icon-demo-large-photo.jpg';
import artworkIcon from 'url:./imgs/demos/icon-demo-artwork.jpg';
import deviceScreenIcon from 'url:./imgs/demos/icon-demo-device-screen.jpg';
import logoIcon from 'url:./imgs/demos/icon-demo-logo.png';
import * as style from './style.css';
import type SnackBarElement from 'shared/custom-els/snack-bar';
import 'shared/custom-els/snack-bar';

const demos = [
  {
    description: 'Large photo',
    size: '2.8MB',
    filename: 'photo.jpg',
    url: largePhoto,
    iconUrl: largePhotoIcon,
  },
  {
    description: 'Artwork',
    size: '2.9MB',
    filename: 'art.jpg',
    url: artwork,
    iconUrl: artworkIcon,
  },
  {
    description: 'Device screen',
    size: '1.6MB',
    filename: 'pixel3.png',
    url: deviceScreen,
    iconUrl: deviceScreenIcon,
  },
  {
    description: 'SVG icon',
    size: '13KB',
    filename: 'squoosh.svg',
    url: logo,
    iconUrl: logoIcon,
  },
] as const;

const supportsClipboardAPI =
  !__PRERENDER__ && navigator.clipboard && navigator.clipboard.read;

async function getImageClipboardItem(
  items: ClipboardItem[],
): Promise<undefined | Blob> {
  for (const item of items) {
    const type = item.types.find((type) => type.startsWith('image/'));
    if (type) return item.getType(type);
  }
}

interface Props {
  onFiles?: (files: File[]) => void;
  showSnack?: SnackBarElement['showSnackbar'];
}
interface State {
  fetchingDemoIndex?: number;
  beforeInstallEvent?: BeforeInstallPromptEvent;
}

export default class Intro extends Component<Props, State> {
  state: State = {};
  private fileInput?: HTMLInputElement;
  private installingViaButton = false;

  componentDidMount() {
    // Listen for beforeinstallprompt events, indicating Squoosh is installable.
    window.addEventListener(
      'beforeinstallprompt',
      this.onBeforeInstallPromptEvent,
    );

    // Listen for the appinstalled event, indicating Squoosh has been installed.
    window.addEventListener('appinstalled', this.onAppInstalled);
  }

  componentWillUnmount() {
    window.removeEventListener(
      'beforeinstallprompt',
      this.onBeforeInstallPromptEvent,
    );
    window.removeEventListener('appinstalled', this.onAppInstalled);
  }

  private onFileChange = (event: Event): void => {
    const fileInput = event.target as HTMLInputElement;
    const files = fileInput.files && Array.from(fileInput.files);
    if (!files || files.length === 0) return;
    this.fileInput!.value = '';
    this.props.onFiles!(files);
  };

  private onOpenClick = () => {
    this.fileInput!.click();
  };

  private onDemoClick = async (index: number, event: Event) => {
    try {
      this.setState({ fetchingDemoIndex: index });
      const demo = demos[index];
      const blob = await fetch(demo.url).then((r) => r.blob());
      const file = new File([blob], demo.filename, { type: blob.type });
      this.props.onFiles!([file]);
    } catch (err) {
      this.setState({ fetchingDemoIndex: undefined });
      this.props.showSnack!(
        "Couldn't load that sample. Check your connection and try again.",
      );
    }
  };

  private onBeforeInstallPromptEvent = (event: BeforeInstallPromptEvent) => {
    // Don't show the mini-infobar on mobile
    event.preventDefault();

    // Save the beforeinstallprompt event so it can be called later.
    this.setState({ beforeInstallEvent: event });
  };

  private onInstallClick = async (event: Event) => {
    // Get the deferred beforeinstallprompt event
    const beforeInstallEvent = this.state.beforeInstallEvent;
    // If there's no deferred prompt, bail.
    if (!beforeInstallEvent) return;

    this.installingViaButton = true;

    // Show the browser install prompt
    beforeInstallEvent.prompt();

    // Wait for the user to accept or dismiss the install prompt
    const { outcome } = await beforeInstallEvent.userChoice;

    // If the prompt was dismissed, we aren't going to install via the button.
    if (outcome === 'dismissed') {
      this.installingViaButton = false;
    }
  };

  private onAppInstalled = () => {
    // We don't need the install button, if it's shown
    this.setState({ beforeInstallEvent: undefined });

    // Clear the install method property
    this.installingViaButton = false;
  };

  private onPasteClick = async () => {
    let clipboardItems: ClipboardItem[];

    try {
      clipboardItems = await navigator.clipboard.read();
    } catch (err) {
      this.props.showSnack!(
        `Squoosh can't see your clipboard. Allow access in your browser, or choose pictures instead.`,
      );
      return;
    }

    const blob = await getImageClipboardItem(clipboardItems);

    if (!blob) {
      this.props.showSnack!(
        `There's no picture on your clipboard. Copy one first, then try again.`,
      );
      return;
    }

    this.props.onFiles!([new File([blob], 'image.unknown')]);
  };

  render({}: Props, { fetchingDemoIndex, beforeInstallEvent }: State) {
    return (
      <div class={style.intro}>
        <input
          class={style.hide}
          ref={linkRef(this, 'fileInput')}
          type="file"
          accept="image/*"
          multiple
          onChange={this.onFileChange}
        />
        <div class={style.wrap}>
          <header class={style.top}>
            <div class={style.brand}>
              <svg
                viewBox="0 0 40 40"
                class={style.brandMark}
                aria-hidden="true"
              >
                <rect
                  x="2"
                  y="2"
                  width="36"
                  height="36"
                  rx="12"
                  class={style.fs}
                  style={{ stroke: 'var(--sage-300)', strokeWidth: 2 }}
                />
                <path
                  d="M10 29C10 17 16 11 29 11c0 13-6 18-19 18Z"
                  class={`${style.st} ${style.fm}`}
                  style={{ strokeWidth: 2.2 }}
                />
                <path
                  d="M12 27c4-6 8-10 13-12"
                  class={style.st}
                  style={{ strokeWidth: 2.2 }}
                />
              </svg>
              Squoosh
            </div>
            {beforeInstallEvent && (
              <button
                class={`${style.btn} ${style.small} ${style.secondary} ${style.installBtn}`}
                type="button"
                onClick={this.onInstallClick}
              >
                <svg viewBox="0 0 24 24" class={style.icon} aria-hidden="true">
                  <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />
                </svg>
                Install app
              </button>
            )}
          </header>

          <main>
            <section class={style.hero}>
              <h1 class={style.headline}>
                Make your pictures smaller, and keep them looking great.
              </h1>
              <p class={style.lede}>
                Squoosh shrinks photos right here in your browser. Nothing is
                uploaded anywhere.
              </p>

              <div class={style.dropZone}>
                <svg
                  viewBox="0 0 200 130"
                  class={style.dropArt}
                  aria-hidden="true"
                >
                  <rect
                    x="30"
                    y="34"
                    width="140"
                    height="88"
                    rx="16"
                    class={`${style.st} ${style.fw}`}
                  />
                  <circle
                    cx="62"
                    cy="62"
                    r="9"
                    class={`${style.st} ${style.fb}`}
                  />
                  <path
                    d="M38 112 84 70l28 26 20-16 30 32Z"
                    class={`${style.st} ${style.fm}`}
                  />
                  <path
                    d="M100 6v32M86 26l14 14 14-14"
                    class={`${style.st} ${style.pk}`}
                  />
                </svg>
                <h2 class={style.dropTitle}>
                  <span class={style.tIdle}>Drop your pictures here</span>
                  <span class={style.tOver}>Let go to start</span>
                </h2>
                <p class={style.dropSub}>
                  or pick them from your device. You can choose more than one.
                </p>
                <div class={style.btnRow}>
                  <button
                    class={`${style.btn} ${style.big} ${style.primary}`}
                    type="button"
                    onClick={this.onOpenClick}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class={style.icon}
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <circle cx="9" cy="9" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                    Choose pictures
                  </button>
                  {supportsClipboardAPI && (
                    <button
                      class={`${style.btn} ${style.big} ${style.secondary}`}
                      type="button"
                      onClick={this.onPasteClick}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        class={style.icon}
                        aria-hidden="true"
                      >
                        <rect x="5" y="4" width="14" height="17" rx="3" />
                        <path d="M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5" />
                      </svg>
                      Paste
                    </button>
                  )}
                </div>
                <p class={style.formats}>
                  Works with JPEG, PNG, WebP, AVIF and more.
                </p>
              </div>
            </section>

            <section class={style.samples} aria-labelledby="try-samples">
              <h2 id="try-samples" class={style.samplesTitle}>
                Or try one of these
              </h2>
              <ul class={style.demos}>
                {demos.map((demo, i) => (
                  <li>
                    <button
                      class={style.sample}
                      type="button"
                      aria-busy={fetchingDemoIndex === i}
                      onClick={(event) => this.onDemoClick(i, event)}
                    >
                      <span class={style.thumb}>
                        <img
                          class={style.thumbImg}
                          src={demo.iconUrl}
                          alt={demo.description}
                        />
                        {fetchingDemoIndex === i && (
                          <span class={style.thumbLoader}>
                            <loading-spinner />
                          </span>
                        )}
                      </span>
                      <strong class={style.sampleName}>
                        {demo.description}
                      </strong>
                      <span class={style.sampleSize}>{demo.size}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section class={style.info} aria-labelledby="why-squoosh">
              <h2 id="why-squoosh" class={style.infoHeading}>
                Why Squoosh
              </h2>
              <div class={`${style.panel} ${style.panelSmall}`}>
                <svg
                  viewBox="0 0 160 120"
                  class={style.panelArt}
                  aria-hidden="true"
                >
                  <rect
                    x="6"
                    y="14"
                    width="80"
                    height="80"
                    rx="16"
                    class={`${style.st} ${style.fm}`}
                  />
                  <path
                    d="M96 58h20M108 48l10 10-10 10"
                    class={`${style.st} ${style.pk}`}
                  />
                  <rect
                    x="124"
                    y="42"
                    width="30"
                    height="30"
                    rx="9"
                    class={`${style.st} ${style.fp}`}
                  />
                </svg>
                <div>
                  <h3 class={style.panelTitle}>Small</h3>
                  <p class={style.panelText}>
                    Smaller images mean faster load times. Squoosh can reduce
                    file size and maintain high quality.
                  </p>
                </div>
              </div>
              <div class={`${style.panel} ${style.panelSimple}`}>
                <svg
                  viewBox="0 0 360 96"
                  class={style.panelArt}
                  aria-hidden="true"
                >
                  <path
                    d="M72 48h50M238 48h50"
                    class={style.st}
                    style={{
                      strokeDasharray: '2 9',
                      stroke: 'var(--sage-300)',
                    }}
                  />
                  <circle
                    cx="40"
                    cy="48"
                    r="30"
                    class={`${style.st} ${style.fk}`}
                  />
                  <path
                    d="m24 62 12-14 8 8 8-10 8 16Z"
                    class={`${style.st} ${style.fw}`}
                    style={{ strokeWidth: 2 }}
                  />
                  <circle
                    cx="180"
                    cy="48"
                    r="30"
                    class={`${style.st} ${style.fb}`}
                  />
                  <path
                    d="M180 28v40M168 40l-8 8 8 8M192 40l8 8-8 8"
                    class={style.st}
                    style={{ strokeWidth: 2.5 }}
                  />
                  <circle
                    cx="320"
                    cy="48"
                    r="30"
                    class={`${style.st} ${style.fm}`}
                  />
                  <path
                    d="M320 34v26M309 51l11 11 11-11"
                    class={style.st}
                    style={{ strokeWidth: 2.5 }}
                  />
                </svg>
                <h3 class={style.panelTitle}>Simple</h3>
                <p class={style.panelText}>
                  Open your image, inspect the differences, then save instantly.
                  Feeling adventurous? Adjust the settings for even smaller
                  files.
                </p>
              </div>
              <div class={`${style.panel} ${style.panelSecure}`}>
                <svg
                  viewBox="0 0 140 120"
                  class={style.panelArt}
                  aria-hidden="true"
                >
                  <rect
                    x="22"
                    y="20"
                    width="96"
                    height="66"
                    rx="14"
                    class={`${style.st} ${style.fw}`}
                  />
                  <path d="M8 100h124" class={style.st} />
                  <rect
                    x="56"
                    y="48"
                    width="28"
                    height="22"
                    rx="7"
                    class={`${style.st} ${style.fp}`}
                  />
                  <path d="M62 48v-6a8 8 0 0 1 16 0v6" class={style.st} />
                </svg>
                <div>
                  <h3 class={style.panelTitle}>Secure</h3>
                  <p class={style.panelText}>
                    Worried about privacy? Images never leave your device since
                    Squoosh does all the work locally.
                  </p>
                </div>
              </div>
            </section>
          </main>

          <footer class={style.footer}>
            <nav class={style.footerNav} aria-label="Footer">
              <a
                class={style.footerLink}
                href="https://github.com/GoogleChromeLabs/squoosh/blob/dev/README.md#privacy"
              >
                Privacy
              </a>
              <a
                class={style.footerLink}
                href="https://github.com/abhi-sawant/squoosh"
              >
                Source on Github
              </a>
              <span>
                fork of{' '}
                <a
                  class={style.footerLink}
                  href="https://github.com/GoogleChromeLabs/squoosh"
                >
                  Squoosh
                </a>
              </span>
            </nav>
          </footer>
        </div>
      </div>
    );
  }
}
