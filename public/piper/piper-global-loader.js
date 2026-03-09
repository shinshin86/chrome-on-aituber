/**
 * piper-plus の ES module をグローバルに公開するローダー。
 * <script type="module"> で読み込むことで、
 * 相対 import の解決を正しく行いつつ、window に公開する。
 */
import { SimpleUnifiedPhonemizer } from './src/simple_unified_api.js';

window.__PiperPlus = { SimpleUnifiedPhonemizer };
window.dispatchEvent(new Event('piper-plus-ready'));
