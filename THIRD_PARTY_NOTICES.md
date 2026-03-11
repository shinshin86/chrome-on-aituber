# NOTICE

This software uses software, libraries, models, speech corpora, and other materials provided by third parties.
Please use them in accordance with the applicable copyright notices and license terms.

This file summarizes copyright notices, license information, credits, and supplemental notes for third-party components used by this software.
If you need the full license texts, also refer to the `licenses/` directory and the official websites of each upstream provider.

---

## 1. Tsukuyomi-chan Corpus

The speech synthesis feature of this software uses a voice model that follows the conditions of a speech corpus related to the free character material "Tsukuyomi-chan."

### Credit

The speech synthesis feature of this software uses voice data published for the free character material "Tsukuyomi-chan" © Rei Yumesaki, as well as related models used in accordance with the applicable terms.

- Name: Tsukuyomi-chan Corpus
- CV: Rei Yumesaki
- Rights holder: Rei Yumesaki
- Official website: https://tyc.rei-yumesaki.net/
- Corpus information: https://tyc.rei-yumesaki.net/material/corpus/
- Credit guide: https://tyc.rei-yumesaki.net/about/terms/credit/
- Terms of use: https://tyc.rei-yumesaki.net/about/terms/

### Notes

- The voice model used by this software is used under conditions compliant with the Tsukuyomi-chan Corpus.
- The Tsukuyomi-chan Corpus and related materials are subject to requirements such as credit display, terms of use, and redistribution handling in addition to ordinary OSS licenses.
- If you redistribute, modify, or create derivative works from this software or related files, please review the conditions described on the official pages above.

---

## 2. piper-plus

This software uses `piper-plus` for part of its speech synthesis processing.

- Name: piper-plus
- Copyright notice: Copyright (c) 2022 Michael Hansen; Copyright (c) 2025 ayutaz
- Distribution source: https://github.com/ayutaz/piper-plus
- License: MIT License

### License summary

Under the MIT License, use, copying, modification, merging, publishing, distribution, sublicensing, and sale are permitted.
However, the copyright notice and license text must be retained.

---

## 3. Piper TTS

This software references `Piper` as a project related to the underlying technology used by `piper-plus`.

- Name: Piper
- Copyright notice: Copyright (c) 2022 Michael Hansen
- Distribution source: https://github.com/rhasspy/piper
- License: MIT License

### Notes

- If this software directly includes code or deliverables from `Piper`, its license terms apply.
- Keep or adjust this section according to the actual contents you distribute.

---

## 4. ONNX Runtime Web

This software uses `onnxruntime-web` to execute ONNX models in the browser.

- Name: ONNX Runtime Web
- Copyright notice: Copyright (c) Microsoft Corporation
- Official website: https://onnxruntime.ai/
- Distribution source: https://www.npmjs.com/package/onnxruntime-web
- License: MIT License

### Notes

This software may include the following distributed files when needed:

- `ort.min.js`
- `ort-wasm.wasm`
- `ort-wasm-simd.wasm`

If you redistribute these files, retain the related copyright notices and license information.

---

## 5. Open JTalk

This software uses deliverables from the `Open JTalk` ecosystem for part of its Japanese speech synthesis related processing.

- Name: Open JTalk
- Distribution source: https://open-jtalk.sourceforge.net/
- License: Modified BSD License (BSD 3-Clause style)

### Notes

Some WASM deliverables, dictionaries, and asset files used together with `piper-plus` may include Open JTalk related components.
If you redistribute them, comply with the BSD 3-Clause License.

---

## 6. Tsukuyomi model for piper-plus

This software may use the following model as a Tsukuyomi-chan Corpus compliant voice model.

- Name: piper-plus-tsukuyomi-chan
- Distribution source: https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan
- Example files:
  - `tsukuyomi-wavlm-300epoch.onnx`
  - `tsukuyomi-config.json`
- License / usage conditions: Compliant with the Tsukuyomi-chan Corpus

### Notes

- This model is not governed solely by common OSS licenses such as MIT or Apache; it is used under conditions derived from the Tsukuyomi-chan Corpus.
- If this software is configured to deliver the model files to client environments, distribution to end-user environments occurs.
- Before redistributing or creating derivative works from this model, review the conditions of the Tsukuyomi-chan Corpus and related terms.

---

## 7. Location of license texts

The full third-party license texts bundled with this software should be stored in the following files as needed:

- `licenses/MIT-piper-plus.txt`
- `licenses/MIT-piper.txt`
- `licenses/MIT-onnxruntime-web.txt`
- `licenses/BSD-3-Clause-open-jtalk.txt`

This `NOTICE` file is intended for overview and credit display purposes.
For detailed legal conditions, the full license texts and the terms on each official website take precedence.

---

## 8. Notes on redistribution

This software may include JavaScript, WASM files, model files, dictionary files, and other assets.
If you redistribute them, keep the following in mind:

1. Do not remove copyright notices or license notices.
2. Retain the full texts of the MIT License and BSD 3-Clause License.
3. For the Tsukuyomi-chan Corpus and related models, review any separately defined usage conditions, credit requirements, and redistribution conditions.
4. Even if the distribution format is a web application, consider that effective distribution may still occur when models or assets are sent to the client.

---

## 9. Disclaimer

Each third-party software component, model, corpus, and related material is provided by its respective rights holder.
Except to the extent stated in each applicable license or terms, the distributor of this software provides no express or implied warranty regarding those third-party components.
