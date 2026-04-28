import * as faceapi from '@vladmandic/face-api';

let loaded = false;

export async function loadFaceModels() {
  if (loaded) return;
  const candidates = ['models', './models', '/models'];
  let lastError = null;
  for (const modelBase of candidates) {
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(modelBase);
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelBase);
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelBase);
      loaded = true;
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Face model files topilmadi yoki noto‘g‘ri. models papkada 6 ta model fayl borligini tekshiring va appni qayta ishga tushiring. (${lastError?.message || 'load failed'})`
  );
}

export async function getDescriptorFromFile(file) {
  await loadFaceModels();
  const img = await faceapi.bufferToImage(file);
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) {
    throw new Error('No face detected in uploaded image.');
  }
  return Array.from(detection.descriptor);
}

export async function recognizeFromVideo(video, labeledDescriptors, threshold = 0.5) {
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(video)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) return null;

  let best = null;
  for (const candidate of labeledDescriptors) {
    const distance = faceapi.euclideanDistance(detection.descriptor, new Float32Array(candidate.descriptor));
    if (!best || distance < best.distance) {
      best = { ...candidate, distance };
    }
  }
  if (!best || best.distance > threshold) return null;
  return best;
}
