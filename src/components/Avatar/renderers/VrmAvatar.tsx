import { useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  Box3,
  Clock,
  DirectionalLight,
  LoopRepeat,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  VRMExpressionPresetName,
  VRMLoaderPlugin,
  VRMUtils,
  type VRM,
} from "@pixiv/three-vrm";
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
  type VRMAnimation,
} from "@pixiv/three-vrm-animation";
import styles from "../Avatar.module.css";

interface Props {
  modelUrl: string;
  animationUrl?: string;
  mouthLevel: number;
}

export function VrmAvatar({ modelUrl, animationUrl, mouthLevel }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouthLevelRef = useRef(mouthLevel);
  const [error, setError] = useState("");

  useEffect(() => {
    mouthLevelRef.current = mouthLevel;
  }, [mouthLevel]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (rendererError) {
      console.error("Failed to initialize VRM WebGL renderer:", rendererError);
      queueMicrotask(() => setError("WebGLを利用できないためVRMを表示できません"));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 1.5));
    const keyLight = new DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(1, 2, 3);
    scene.add(keyLight);
    const camera = new PerspectiveCamera(30, 1, 0.01, 100);
    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = true;
    controls.enableDamping = true;
    const clock = new Clock();
    let disposed = false;
    let animationFrameId = 0;
    let loadedVrm: VRM | null = null;
    let mixer: AnimationMixer | null = null;

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          setError("VRMモデルを読み込めませんでした");
          return;
        }
        VRMUtils.rotateVRM0(vrm);
        const bounds = new Box3().setFromObject(vrm.scene);
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());
        vrm.scene.position.x -= center.x;
        vrm.scene.position.z -= center.z;
        vrm.scene.position.y -= bounds.min.y;
        const height = Math.max(size.y, 1);
        const lookAtY = height * 0.66;
        const distance = height * 1.3;
        camera.position.set(0, lookAtY, distance);
        controls.target.set(0, lookAtY, 0);
        controls.minDistance = distance * 0.65;
        controls.maxDistance = distance * 1.8;
        controls.update();
        scene.add(vrm.scene);
        loadedVrm = vrm;

        if (animationUrl) {
          const animationLoader = new GLTFLoader();
          animationLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
          animationLoader.load(animationUrl, (animationGltf) => {
            if (disposed) return;
            const vrmAnimations = animationGltf.userData.vrmAnimations as VRMAnimation[] | undefined;
            const animation = vrmAnimations?.[0];
            if (!animation) return;
            const clip = createVRMAnimationClip(
              animation,
              vrm as unknown as Parameters<typeof createVRMAnimationClip>[1]
            );
            const hipsNodeName = vrm.humanoid.getNormalizedBoneNode("hips")?.name;
            const tracks = hipsNodeName
              ? clip.tracks.filter((track) => track.name !== `${hipsNodeName}.position`)
              : clip.tracks;
            mixer = new AnimationMixer(vrm.scene);
            mixer.clipAction(new AnimationClip(clip.name, clip.duration, tracks))
              .setLoop(LoopRepeat, Infinity)
              .play();
          });
        }
      },
      undefined,
      (loadError) => {
        console.error("Failed to load VRM:", loadError);
        if (!disposed) setError("VRMモデルを読み込めませんでした");
      }
    );

    const animate = () => {
      const delta = clock.getDelta();
      if (loadedVrm) {
        loadedVrm.expressionManager?.setValue(
          VRMExpressionPresetName.Aa,
          Math.min(1, mouthLevelRef.current)
        );
        mixer?.update(delta);
        loadedVrm.update(delta);
      }
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      mixer?.stopAllAction();
      if (loadedVrm) VRMUtils.deepDispose(loadedVrm.scene);
      renderer.dispose();
    };
  }, [animationUrl, modelUrl]);

  return (
    <div ref={containerRef} className={styles.renderer}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="VRM avatar" />
      {error && <div className={styles.status}>{error}</div>}
    </div>
  );
}
