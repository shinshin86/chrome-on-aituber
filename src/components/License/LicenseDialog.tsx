import styles from "../Manual/Manual.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LicenseDialog({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>ライセンス / クレジット</h2>

        {/* つくよみちゃん — 規約上、目立つ場所に十分な文字サイズで表記が必要 */}
        <section className={styles.section}>
          <h3>つくよみちゃんコーパス</h3>
          <p style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>
            本ソフトウェアの音声合成には、フリー素材キャラクター「つくよみちゃん」
            &copy; Rei Yumesaki
            が無料公開している音声データを使用しています。
          </p>
          <p>つくよみちゃんコーパス（CV.夢前黎）</p>
          <p>
            <a
              href="https://tyc.rei-yumesaki.net/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://tyc.rei-yumesaki.net/
            </a>
          </p>
        </section>

        <section className={styles.section}>
          <h3>piper-plus (MIT License)</h3>
          <p>
            OpenJTalk WASM ベースの音声合成エンジン。
            <br />
            Copyright &copy; ayutaz
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
            Copyright &copy; Michael Hansen
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
            Copyright &copy; 2008-2016 Nagoya Institute of Technology,
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
          <h3>ミコ — PNGTuber アバター素材</h3>
          <p>
            デフォルトアバターとして使用している PNGTuber 素材「ミコ」は
            AITuber OnAir が提供するフリー素材です。
          </p>
          <p>&copy; AITuber OnAir / Miko</p>
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

        <button className={styles.closeBtn} onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
