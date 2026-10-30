# Miko voice model (sample-voice-v2)

`miko-sample-voice-v2.onnx` is `sample-voice-v2.onnx` from
https://huggingface.co/shinshin86/aituber-onair-miko-voice-piper-plus,
renamed only. It is a piper-plus model fine-tuned from the piper-plus `zs-v1`
base model to speak as Miko, the official character of AITuber OnAir. The
voice is synthetic: its training data was generated with Irodori-TTS from a
designed voice, not recorded from a person.

- Model weights: MIT, following the base model. See
  `piper-plus-base-model-MIT.txt` and `piper-plus-base-model-NOTICE.md` for the
  base model's provenance, including the datasets its authors used.
  `piper-plus-base-model-NOTICE.md` is reproduced as published with this
  model. The files it mentions (such as `provenance.json` and
  `licenses/CAMPP-APACHE-2.0.txt`) belong to the upstream base model bundle
  at https://huggingface.co/ayousanz/piper-plus-base and are not included
  here.
- Training sentences: original sentences written for this model and the ITA
  corpus (public domain).
- Teacher model used to generate the training audio: Irodori-TTS (MIT).

Miko is the official character of AITuber OnAir, © Yuki Shindo. Use of the
character follows the Miko Character Usage Guidelines
(https://miko.aituberonair.com/#terms).

Do not present output from this model as a recording of a real person.
