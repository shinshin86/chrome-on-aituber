import { useI18n } from "../../i18n/useI18n";
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
const NPM_NOTICE_URL = `${import.meta.env.BASE_URL}licenses/NPM-THIRD-PARTY-NOTICES.txt`;
const MIKO_GUIDELINES_URL_JA = "https://miko.aituberonair.com/#terms";
const MIKO_GUIDELINES_URL_EN = "https://miko.aituberonair.com/en#terms";
const PURUPURU_FORMAT_URL = "https://github.com/rotejin/PuruPuruPNGTuber";

interface AvatarLicenseLinkProps {
  fileName: string;
  label: string;
}

function AvatarLicenseLink({ fileName, label }: AvatarLicenseLinkProps) {
  return (
    <a
      href={`${AVATAR_LICENSE_BASE_URL}/${fileName}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}

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
          Piper Plus、Irodori TTS、および本Webアプリのnpm本番依存関係の
          notices とライセンス本文を配信アセットに同梱しています。
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
          {" / "}
          <a href={NPM_NOTICE_URL} target="_blank" rel="noopener noreferrer">
            npm production dependencies
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
        <h3>AITuber OnAir — アバター表示実装</h3>
        <p>
          PNGTuber、Pet、VRM、PSD、ぷるぷるPNGTuber、Inochi2Dを
          選択・表示するため、AITuber OnAirのサンプル実装を利用・調整しています。
        </p>
        <p>
          <AvatarLicenseLink
            fileName="AITUBER-ONAIR-MIT.txt"
            label="AITuber OnAir — 複数形式のアバター表示実装（MIT License）"
          />
        </p>
      </section>

      <section className={styles.section}>
        <h3>VRMアバター描画</h3>
        <p>
          3D VRMモデルの読み込み・描画と、VRMアニメーションの再生に
          three.js、@pixiv/three-vrm、@pixiv/three-vrm-animationを使用しています。
        </p>
        <p>
          <AvatarLicenseLink
            fileName="THREE-MIT.txt"
            label="three.js — 3D描画基盤（MIT License）"
          />
          <br />
          <AvatarLicenseLink
            fileName="THREE-VRM-MIT.txt"
            label="@pixiv/three-vrm — VRM読込・描画（MIT License）"
          />
          <br />
          <AvatarLicenseLink
            fileName="THREE-VRM-ANIMATION-MIT.txt"
            label="@pixiv/three-vrm-animation — VRMアニメーション再生（MIT License）"
          />
        </p>
      </section>

      <section className={styles.section}>
        <h3>PSDアバター描画</h3>
        <p>
          PSDレイヤーの解析と、2Dアバターのパーツ描画・変形に
          @webtoon/psd、ag-psd、Anime2.5DRigを使用しています。
        </p>
        <p>
          <AvatarLicenseLink
            fileName="WEBTOON-PSD-MIT.txt"
            label="@webtoon/psd — PSDレイヤー解析（MIT License）"
          />
          <br />
          <AvatarLicenseLink
            fileName="AG-PSD-MIT.txt"
            label="ag-psd — PSD画像データ解析（MIT License）"
          />
          <br />
          <AvatarLicenseLink
            fileName="ANIME25DRIG-MIT.txt"
            label="Anime2.5DRig — パーツ識別・変形描画（MIT License）"
          />
        </p>
      </section>

      <section className={styles.section}>
        <h3>ぷるぷるPNGTuber描画</h3>
        <p>
          画像の揺れ・伸縮・変形によるぷるぷるPNGTuberの描画に、
          rotejin/PuruPuruPNGTuberで定義されているアバター形式と、
          その形式に対応するAITuber OnAirのサンプル実装を使用しています。
          内蔵ミコ画像素材には、後述のMiko公式利用ガイドラインが適用されます。
        </p>
        <p>
          <a
            href={PURUPURU_FORMAT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            使用しているアバター形式 — rotejin/PuruPuruPNGTuber
          </a>
          <br />
          <AvatarLicenseLink
            fileName="PURUPURU-PNGTUBER-APACHE-2.0.txt"
            label="コード・ドキュメント — Apache License 2.0"
          />
        </p>
      </section>

      <section className={styles.section}>
        <h3>PSD Sample — 内蔵PSDアバター</h3>
        <p>
          内蔵PSD Sampleは、AITuber OnAirのサンプル内で生成されたデモ用素材です。
          第三者キャラクターの画像素材は含まず、関連する実装とライブラリの
          ライセンス本文は上記リンクから確認できます。
        </p>
        <p>
          <AvatarLicenseLink
            fileName="AITUBER-ONAIR-MIT.txt"
            label="AITuber OnAir — PSDサンプル実装（MIT License）"
          />
        </p>
      </section>

      <section className={styles.section}>
        <h3>Aka Inochi2D — 内蔵モデル</h3>
        <p>
          Inochi2D runtime の依存ライセンスは同梱 notice を参照してください。
          Aka modelはseagetchによるCC BY 4.0素材で、AITuber OnAir向けに
          リグ・モーションを調整しています。
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
        <p>
          現行ガイドラインでは商用利用が認められ、利用料とクレジット表記は
          不要です。公式・第三者を問わず、ソフトウェア、アプリ、ゲーム、映像、
          Webサイトその他の作品・コンテンツの一部として一体で再配布できます。
          素材単体・素材集としての再配布や、素材提供を主目的とする配布は禁止です。
          公式・提携を装ったり、ミコの権利や独占的な利用権を主張したりすることは
          できません。
        </p>
        <p>&copy; Yuki Shindo (AITuber OnAir)</p>
        <p>ミコはAITuber OnAirの公式キャラクターです。</p>
        <p>
          <AvatarLicenseLink
            fileName="MIKO_ASSET_TERMS.md"
            label="同梱の利用条件（要約）"
          />
          {" / "}
          <a
            href={MIKO_GUIDELINES_URL_JA}
            target="_blank"
            rel="noopener noreferrer"
          >
            Miko公式利用ガイドライン
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>ユーザーが追加するカスタムアバター</h3>
        <p>
          カスタムアバターを使用する場合は、利用・改変・保存・表示に必要な権利、
          ライセンス条件、クレジット条件をユーザー自身で確認してください。
          本アプリに読み込むことで、新たな利用権や再配布権が付与されることはありません。
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
          Notices and license texts for Piper Plus, Irodori TTS, and the npm
          production dependencies of this web app are bundled with the
          distributed assets.
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
          {" / "}
          <a href={NPM_NOTICE_URL} target="_blank" rel="noopener noreferrer">
            npm production dependencies
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
        <h3>AITuber OnAir — avatar display implementation</h3>
        <p>
          This app uses and adapts AITuber OnAir examples to select and display
          PNGTuber, Pet, VRM, PSD, PuruPuru PNGTuber, and Inochi2D avatars.
        </p>
        <p>
          <AvatarLicenseLink
            fileName="AITUBER-ONAIR-MIT.txt"
            label="AITuber OnAir — multi-format avatar examples (MIT License)"
          />
        </p>
      </section>

      <section className={styles.section}>
        <h3>VRM avatar rendering</h3>
        <p>
          three.js, @pixiv/three-vrm, and @pixiv/three-vrm-animation are used
          to load and render 3D VRM models and play VRM animations.
        </p>
        <p>
          <AvatarLicenseLink
            fileName="THREE-MIT.txt"
            label="three.js — 3D rendering foundation (MIT License)"
          />
          <br />
          <AvatarLicenseLink
            fileName="THREE-VRM-MIT.txt"
            label="@pixiv/three-vrm — VRM loading and rendering (MIT License)"
          />
          <br />
          <AvatarLicenseLink
            fileName="THREE-VRM-ANIMATION-MIT.txt"
            label="@pixiv/three-vrm-animation — VRM animation playback (MIT License)"
          />
        </p>
      </section>

      <section className={styles.section}>
        <h3>PSD avatar rendering</h3>
        <p>
          @webtoon/psd, ag-psd, and Anime2.5DRig are used to parse PSD layers
          and render and deform the parts of a 2D avatar.
        </p>
        <p>
          <AvatarLicenseLink
            fileName="WEBTOON-PSD-MIT.txt"
            label="@webtoon/psd — PSD layer parsing (MIT License)"
          />
          <br />
          <AvatarLicenseLink
            fileName="AG-PSD-MIT.txt"
            label="ag-psd — PSD image data parsing (MIT License)"
          />
          <br />
          <AvatarLicenseLink
            fileName="ANIME25DRIG-MIT.txt"
            label="Anime2.5DRig — part detection and deformation rendering (MIT License)"
          />
        </p>
      </section>

      <section className={styles.section}>
        <h3>PuruPuru PNGTuber rendering</h3>
        <p>
          The image sway, stretch, and deformation rendering uses the avatar
          format defined by rotejin/PuruPuruPNGTuber and the corresponding
          AITuber OnAir example. The bundled Miko image assets remain subject
          to the official Miko usage guidelines described below.
        </p>
        <p>
          <a
            href={PURUPURU_FORMAT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Avatar format used — rotejin/PuruPuruPNGTuber
          </a>
          <br />
          <AvatarLicenseLink
            fileName="PURUPURU-PNGTUBER-APACHE-2.0.txt"
            label="Code and documentation — Apache License 2.0"
          />
        </p>
      </section>

      <section className={styles.section}>
        <h3>PSD Sample — bundled PSD avatar</h3>
        <p>
          The bundled PSD Sample is demo material generated within the
          AITuber OnAir example. It does not contain third-party character
          artwork. License texts for the related implementation and libraries
          are available through the links above.
        </p>
        <p>
          <AvatarLicenseLink
            fileName="AITUBER-ONAIR-MIT.txt"
            label="AITuber OnAir — PSD sample implementation (MIT License)"
          />
        </p>
      </section>

      <section className={styles.section}>
        <h3>Aka Inochi2D — bundled model</h3>
        <p>
          See the bundled notices for the Inochi2D runtime dependencies.
          The Aka model is CC BY 4.0 material by seagetch, with its rig and
          motion adapted for the AITuber OnAir example.
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
        <p>
          The current guidelines allow commercial use and require neither a
          usage fee nor credit. Official and third-party projects may
          redistribute the assets as an integral part of software, apps,
          games, videos, websites, and other works or content. Standalone
          redistribution, asset collections, and distributions primarily
          intended to provide the assets are prohibited. Do not imply official
          affiliation or claim ownership or exclusive rights to Miko.
        </p>
        <p>&copy; Yuki Shindo (AITuber OnAir)</p>
        <p>Miko is the official character of AITuber OnAir.</p>
        <p>
          The Japanese guidelines are authoritative. The English page is a
          reference translation.
        </p>
        <p>
          <AvatarLicenseLink
            fileName="MIKO_ASSET_TERMS.md"
            label="Bundled terms summary"
          />
          {" / "}
          <a
            href={MIKO_GUIDELINES_URL_EN}
            target="_blank"
            rel="noopener noreferrer"
          >
            English reference translation
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h3>User-provided custom avatars</h3>
        <p>
          Before using a custom avatar, users are responsible for confirming
          the rights and license terms required to use, modify, store, and
          display it, including any credit requirements. Loading an avatar
          into this app does not grant any additional usage or redistribution
          rights.
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
