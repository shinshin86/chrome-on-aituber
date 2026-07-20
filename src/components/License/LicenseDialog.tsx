import { useI18n } from "../../i18n/I18nContext";
import styles from "../Manual/Manual.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PIPER_LICENSE_BASE_URL = `${import.meta.env.BASE_URL}piper/licenses`;
const IRODORI_LICENSE_BASE_URL = `${import.meta.env.BASE_URL}irodori/licenses`;
const AVATAR_LICENSE_BASE_URL = `${import.meta.env.BASE_URL}avatar-licenses`;
const INOCHI_NOTICE_URL = `${import.meta.env.BASE_URL}inochi2d/runtime/THIRD-PARTY-NOTICES.md`;
const AKA_ATTRIBUTION_URL = `${import.meta.env.BASE_URL}inochi2d/models/Aka.ATTRIBUTION.md`;

function LicenseBodyJa() {
  return (
    <>
      {/* つくよみちゃん — 規約上、目立つ場所に十分な文字サイズで表記が必要 */}
      <section className={styles.section}>
        <h3>つくよみちゃんコーパス</h3>
        <p style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>
          本ソフトウェアの音声合成には、フリー素材キャラクター
          「つくよみちゃん」 &copy; Rei Yumesaki
          が無料公開している音声データおよび、その利用条件に準拠した関連モデルを使用しています。
        </p>
        <p>つくよみちゃんコーパス（CV.夢前黎）</p>
        <p>
          本アプリの音声モデルには、つくよみちゃんコーパス準拠のモデルを使用しています。
        </p>
        <p>
          <a
            href="https://tyc.rei-yumesaki.net/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://tyc.rei-yumesaki.net/
          </a>
        </p>
        <p>
          <a
            href="https://tyc.rei-yumesaki.net/material/corpus/"
            target="_blank"
            rel="noopener noreferrer"
          >
            コーパス情報
          </a>
          {" / "}
          <a
            href="https://tyc.rei-yumesaki.net/about/terms/credit/"
            target="_blank"
            rel="noopener noreferrer"
          >
            クレジットガイド
          </a>
          {" / "}
          <a
            href="https://tyc.rei-yumesaki.net/about/terms/"
            target="_blank"
            rel="noopener noreferrer"
          >
            利用規約
          </a>
        </p>
        <p>詳細な利用条件は公式規約を参照してください。</p>
      </section>

      <section className={styles.section}>
        <h3>piper-plus (MIT License)</h3>
        <p>
          OpenJTalk WASM ベースの音声合成エンジン。
          <br />
          Copyright &copy; 2022 Michael Hansen
          <br />
          Copyright &copy; 2025 ayutaz
        </p>
        <p>
          <a
            href="https://github.com/ayutaz/piper-plus"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://github.com/ayutaz/piper-plus
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>Piper TTS (MIT License)</h3>
        <p>
          ニューラル音声合成フレームワーク。
          <br />
          Copyright &copy; 2022 Michael Hansen
        </p>
        <p>
          <a
            href="https://github.com/rhasspy/piper"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://github.com/rhasspy/piper
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>ONNX Runtime Web (MIT License)</h3>
        <p>
          ブラウザ上での ONNX モデル推論エンジン。
          <br />
          Copyright &copy; Microsoft Corporation
        </p>
        <p>
          <a
            href="https://onnxruntime.ai/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://onnxruntime.ai/
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>Open JTalk (BSD 3-Clause License)</h3>
        <p>
          日本語テキスト音声合成システム。
          <br />
          Copyright &copy; 2008-2018 Nagoya Institute of Technology,
          Department of Computer Science
        </p>
        <p>
          <a
            href="https://open-jtalk.sourceforge.net/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://open-jtalk.sourceforge.net/
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>Third-Party Notices / License Texts</h3>
        <p>
          Piper Plus と Irodori TTS の notices とライセンス本文は、
          配信アセット内の <code>licenses/</code> に同梱しています。
        </p>
        <p>
          <a
            href={`${PIPER_LICENSE_BASE_URL}/THIRD_PARTY_NOTICES.txt`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Piper THIRD_PARTY_NOTICES
          </a>
          {" / "}
          <a
            href={`${IRODORI_LICENSE_BASE_URL}/THIRD_PARTY_NOTICES.txt`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Irodori THIRD_PARTY_NOTICES
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>NAIST Japanese Dictionary (BSD 3-Clause License)</h3>
        <p>
          形態素解析用日本語辞書。
          <br />
          Copyright &copy; 2009 Nara Institute of Science and Technology
          <br />
          Copyright &copy; 2011-2017 The UniDic Consortium
        </p>
      </section>

      <section className={styles.section}>
        <h3>HTS Voice "Mei" (CC BY 3.0)</h3>
        <p>
          HTS 音声ファイル。
          <br />
          Copyright &copy; 2009-2015 Nagoya Institute of Technology,
          Department of Computer Science / MMDAgent Project Team
        </p>
        <p>
          <a
            href="https://creativecommons.org/licenses/by/3.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Creative Commons Attribution 3.0 License
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>アバター描画ライブラリ</h3>
        <p>
          AITuber OnAir のサンプル実装、three.js / three-vrm、@webtoon/psd、
          ag-psd、Anime2.5DRig を各ライセンスに従って使用しています。
        </p>
        <p>
          <a href={`${AVATAR_LICENSE_BASE_URL}/AITUBER-ONAIR-MIT.txt`} target="_blank" rel="noopener noreferrer">AITuber OnAir MIT</a>
          {" / "}
          <a href={`${AVATAR_LICENSE_BASE_URL}/THREE-VRM-MIT.txt`} target="_blank" rel="noopener noreferrer">three-vrm MIT</a>
          {" / "}
          <a href={`${AVATAR_LICENSE_BASE_URL}/WEBTOON-PSD-MIT.txt`} target="_blank" rel="noopener noreferrer">@webtoon/psd MIT</a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>Inochi2D runtime / Aka model</h3>
        <p>
          Inochi2D runtime の依存ライセンスは同梱 notice を参照してください。
          Aka model: seagetch / CC BY 4.0（AITuber OnAir 向けにリグ・モーションを調整）。
        </p>
        <p>
          <a href={INOCHI_NOTICE_URL} target="_blank" rel="noopener noreferrer">Runtime notices</a>
          {" / "}
          <a href={AKA_ATTRIBUTION_URL} target="_blank" rel="noopener noreferrer">Aka attribution</a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>ミコ — 内蔵アバター素材</h3>
        <p>
          PNGTuber、ぷるぷるPNGTuber、Pet、VRM の内蔵デフォルトで使用する
          「ミコ」は AITuber OnAir の公式キャラクターです。
        </p>
        <p>&copy; AITuber OnAir / shinshin86</p>
        <p>
          <a
            href="https://miko.aituberonair.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://miko.aituberonair.com/
          </a>
        </p>
      </section>
    </>
  );
}

function LicenseBodyEn() {
  return (
    <>
      {/* Tsukuyomi-chan terms require credit in a prominent place with sufficient font size. */}
      <section className={styles.section}>
        <h3>Tsukuyomi-chan Corpus</h3>
        <p style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>
          This software uses voice data made available free of charge by the
          free-material character "Tsukuyomi-chan" &copy; Rei Yumesaki, and
          related models that comply with its usage conditions, for speech
          synthesis.
        </p>
        <p>Tsukuyomi-chan Corpus (CV: Rei Yumesaki)</p>
        <p>
          The voice model in this app uses a model that complies with the
          Tsukuyomi-chan Corpus.
        </p>
        <p>
          <a
            href="https://tyc.rei-yumesaki.net/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://tyc.rei-yumesaki.net/
          </a>
        </p>
        <p>
          <a
            href="https://tyc.rei-yumesaki.net/material/corpus/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Corpus information
          </a>
          {" / "}
          <a
            href="https://tyc.rei-yumesaki.net/about/terms/credit/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Credit guide
          </a>
          {" / "}
          <a
            href="https://tyc.rei-yumesaki.net/about/terms/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms of use
          </a>
        </p>
        <p>See the official terms for detailed usage conditions.</p>
      </section>

      <section className={styles.section}>
        <h3>piper-plus (MIT License)</h3>
        <p>
          OpenJTalk WASM-based speech synthesis engine.
          <br />
          Copyright &copy; 2022 Michael Hansen
          <br />
          Copyright &copy; 2025 ayutaz
        </p>
        <p>
          <a
            href="https://github.com/ayutaz/piper-plus"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://github.com/ayutaz/piper-plus
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>Piper TTS (MIT License)</h3>
        <p>
          Neural speech synthesis framework.
          <br />
          Copyright &copy; 2022 Michael Hansen
        </p>
        <p>
          <a
            href="https://github.com/rhasspy/piper"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://github.com/rhasspy/piper
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>ONNX Runtime Web (MIT License)</h3>
        <p>
          ONNX model inference engine for browsers.
          <br />
          Copyright &copy; Microsoft Corporation
        </p>
        <p>
          <a
            href="https://onnxruntime.ai/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://onnxruntime.ai/
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>Open JTalk (BSD 3-Clause License)</h3>
        <p>
          Japanese text-to-speech synthesis system.
          <br />
          Copyright &copy; 2008-2018 Nagoya Institute of Technology,
          Department of Computer Science
        </p>
        <p>
          <a
            href="https://open-jtalk.sourceforge.net/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://open-jtalk.sourceforge.net/
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>Third-Party Notices / License Texts</h3>
        <p>
          Notices and license texts for Piper Plus and Irodori TTS are bundled
          in <code>licenses/</code> inside the distributed assets.
        </p>
        <p>
          <a
            href={`${PIPER_LICENSE_BASE_URL}/THIRD_PARTY_NOTICES.txt`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Piper THIRD_PARTY_NOTICES
          </a>
          {" / "}
          <a
            href={`${IRODORI_LICENSE_BASE_URL}/THIRD_PARTY_NOTICES.txt`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Irodori THIRD_PARTY_NOTICES
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>NAIST Japanese Dictionary (BSD 3-Clause License)</h3>
        <p>
          Japanese dictionary for morphological analysis.
          <br />
          Copyright &copy; 2009 Nara Institute of Science and Technology
          <br />
          Copyright &copy; 2011-2017 The UniDic Consortium
        </p>
      </section>

      <section className={styles.section}>
        <h3>HTS Voice "Mei" (CC BY 3.0)</h3>
        <p>
          HTS voice files.
          <br />
          Copyright &copy; 2009-2015 Nagoya Institute of Technology,
          Department of Computer Science / MMDAgent Project Team
        </p>
        <p>
          <a
            href="https://creativecommons.org/licenses/by/3.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Creative Commons Attribution 3.0 License
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>Avatar rendering libraries</h3>
        <p>
          This app uses AITuber OnAir example implementations, three.js /
          three-vrm, @webtoon/psd, ag-psd, and Anime2.5DRig under their
          respective licenses.
        </p>
        <p>
          <a href={`${AVATAR_LICENSE_BASE_URL}/AITUBER-ONAIR-MIT.txt`} target="_blank" rel="noopener noreferrer">AITuber OnAir MIT</a>
          {" / "}
          <a href={`${AVATAR_LICENSE_BASE_URL}/THREE-VRM-MIT.txt`} target="_blank" rel="noopener noreferrer">three-vrm MIT</a>
          {" / "}
          <a href={`${AVATAR_LICENSE_BASE_URL}/WEBTOON-PSD-MIT.txt`} target="_blank" rel="noopener noreferrer">@webtoon/psd MIT</a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>Inochi2D runtime / Aka model</h3>
        <p>
          See the bundled notices for the Inochi2D runtime dependencies.
          Aka model: seagetch / CC BY 4.0, with rig and motion adapted for the
          AITuber OnAir example.
        </p>
        <p>
          <a href={INOCHI_NOTICE_URL} target="_blank" rel="noopener noreferrer">Runtime notices</a>
          {" / "}
          <a href={AKA_ATTRIBUTION_URL} target="_blank" rel="noopener noreferrer">Aka attribution</a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>Miko — bundled avatar assets</h3>
        <p>
          Miko, used by the bundled PNGTuber, PuruPuru PNGTuber, Pet, and VRM
          defaults, is the official character of AITuber OnAir.
        </p>
        <p>&copy; AITuber OnAir / shinshin86</p>
        <p>
          <a
            href="https://miko.aituberonair.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://miko.aituberonair.com/
          </a>
        </p>
      </section>
    </>
  );
}

export function LicenseDialog({ open, onClose }: Props) {
  const { language, t } = useI18n();

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{t("license.title")}</h2>

        {language === "en" ? <LicenseBodyEn /> : <LicenseBodyJa />}

        <button className={styles.closeBtn} onClick={onClose}>
          {t("license.close")}
        </button>
      </div>
    </div>
  );
}
