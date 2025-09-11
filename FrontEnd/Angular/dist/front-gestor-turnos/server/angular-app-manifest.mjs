
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: undefined,
  entryPointToBrowserMapping: {},
  assets: {
    'index.csr.html': {size: 2120, hash: 'f7d4bceba53af58ba31df1f592e43aba4bfdf8806f8ba0c1bcc00de3c21a71d9', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1709, hash: '5c5b86d0935efe839289bb26f71b2d6c02c3ad5f8ae6f38ed8d442a5e1191003', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-M54PZA2O.css': {size: 7869, hash: 'njMHsGHfcio', text: () => import('./assets-chunks/styles-M54PZA2O_css.mjs').then(m => m.default)}
  },
};
