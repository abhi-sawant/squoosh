// The prebuilt browser bundle has no type declarations of its own; reuse the
// types from the main 'jszip' package, which ships the same default export.
declare module 'jszip/dist/jszip.min.js' {
  import JSZip from 'jszip';
  export default JSZip;
}
