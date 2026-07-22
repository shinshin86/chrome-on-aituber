import { useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  Box3,
  Clock,
  DirectionalLight,
  Euler,
  LoopRepeat,
  MOUSE,
  PerspectiveCamera,
  Quaternion,
  Scene,
  sRGBEncoding,
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
import {
  deleteAvatarViewTransform,
  loadVrmViewTransform,
  saveVrmViewTransform,
} from "../../../services/storage/storageService";
import type { VrmViewTransform } from "../../../types";
import styles from "../Avatar.module.css";

interface Props {
  avatarId: string;
  modelUrl: string;
  animationUrl?: string;
  mouthLevel: number;
}

const FRONT_FACING_BONES = ["hips", "spine", "chest", "upperChest", "neck", "head"] as const;

function centerAnimationYaw(clip: AnimationClip, vrm: VRM) {
  const quaternionTrackNames = new Set(
    FRONT_FACING_BONES.map((boneName) => vrm.humanoid.getNormalizedBoneNode(boneName)?.name)
      .filter((nodeName): nodeName is string => Boolean(nodeName))
      .map((nodeName) => `${nodeName}.quaternion`)
  );
  const quaternion = new Quaternion();
  const euler = new Euler(0, 0, 0, "YXZ");

  clip.tracks.forEach((track) => {
    if (
      !quaternionTrackNames.has(track.name) ||
      track.values.length < 4 ||
      track.values.length !== track.times.length * 4
    ) {
      return;
    }

    let sinSum = 0;
    let cosSum = 0;
    for (let index = 0; index < track.values.length; index += 4) {
      quaternion.fromArray(track.values, index);
      euler.setFromQuaternion(quaternion, "YXZ");
      sinSum += Math.sin(euler.y);
      cosSum += Math.cos(euler.y);
    }
    const centerYaw = Math.atan2(sinSum, cosSum);

    for (let index = 0; index < track.values.length; index += 4) {
      quaternion.fromArray(track.values, index);
      euler.setFromQuaternion(quaternion, "YXZ");
      euler.y -= centerYaw;
      quaternion.setFromEuler(euler);
      track.values[index] = quaternion.x;
      track.values[index + 1] = quaternion.y;
      track.values[index + 2] = quaternion.z;
      track.values[index + 3] = quaternion.w;
    }
  });
}

export function VrmAvatar({ avatarId, modelUrl, animationUrl, mouthLevel }: Props) {
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
    renderer.outputEncoding = sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 1.0));
    const keyLight = new DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(1.0, 1.8, 1.2);
    scene.add(keyLight);
    const camera = new PerspectiveCamera(30, 1, 0.01, 100);
    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = true;
    controls.enableDamping = true;
    controls.screenSpacePanning = true;
    controls.mouseButtons.LEFT = MOUSE.PAN;
    controls.mouseButtons.MIDDLE = MOUSE.DOLLY;
    controls.mouseButtons.RIGHT = MOUSE.ROTATE;
    const clock = new Clock();
    let disposed = false;
    let animationFrameId = 0;
    let loadedVrm: VRM | null = null;
    let mixer: AnimationMixer | null = null;
    let defaultViewTransform: VrmViewTransform | null = null;

    const updateViewDataAttributes = () => {
      canvas.dataset.avatarViewCamera = camera.position
        .toArray()
        .map((value) => value.toFixed(4))
        .join(",");
      canvas.dataset.avatarViewTarget = controls.target
        .toArray()
        .map((value) => value.toFixed(4))
        .join(",");
    };

    const applyViewTransform = (view: VrmViewTransform) => {
      camera.position.fromArray(view.cameraPosition);
      controls.target.fromArray(view.target);
      controls.update();
      updateViewDataAttributes();
    };

    const saveCurrentViewTransform = () => {
      if (!defaultViewTransform) return;
      saveVrmViewTransform(avatarId, {
        cameraPosition: camera.position.toArray(),
        target: controls.target.toArray(),
      });
      updateViewDataAttributes();
    };

    const resetViewTransform = (event: MouseEvent) => {
      if (!defaultViewTransform) return;
      event.preventDefault();
      applyViewTransform(defaultViewTransform);
      deleteAvatarViewTransform(avatarId);
    };

    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    controls.addEventListener("end", saveCurrentViewTransform);
    canvas.addEventListener("dblclick", resetViewTransform);
    canvas.addEventListener("contextmenu", preventContextMenu);

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
        defaultViewTransform = {
          cameraPosition: camera.position.toArray(),
          target: controls.target.toArray(),
        };
        const storedViewTransform = loadVrmViewTransform(avatarId);
        if (storedViewTransform) applyViewTransform(storedViewTransform);
        controls.update();
        updateViewDataAttributes();
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
            centerAnimationYaw(clip, vrm);
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
      controls.removeEventListener("end", saveCurrentViewTransform);
      controls.dispose();
      canvas.removeEventListener("dblclick", resetViewTransform);
      canvas.removeEventListener("contextmenu", preventContextMenu);
      mixer?.stopAllAction();
      if (loadedVrm) VRMUtils.deepDispose(loadedVrm.scene);
      renderer.dispose();
    };
  }, [animationUrl, avatarId, modelUrl]);

  return (
    <div ref={containerRef} className={styles.renderer}>
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${styles.interactiveCanvas}`}
        aria-label="VRM avatar"
        data-avatar-view-id={avatarId}
      />
      {error && <div className={styles.status}>{error}</div>}
    </div>
  );
}
