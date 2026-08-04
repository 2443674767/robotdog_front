/**
 * RTSP → WebRTC 网关拉流（浏览器端）
 * 支持：
 * - go2rtc: POST {gateway}/api/webrtc?src=...
 * - whep:   POST 完整 WHEP URL（MediaMTX 等）
 */

export type WebRtcMode = 'go2rtc' | 'whep';

export type WebRtcPlayOptions = {
  /** video 元素 */
  video: HTMLVideoElement;
  /** go2rtc 网关，如 http://10.21.31.111:1984 */
  gateway?: string;
  /** go2rtc 的 src：流名或完整 RTSP URL */
  src?: string;
  /** WHEP 完整地址（mode=whep 时必填） */
  whepUrl?: string;
  mode?: WebRtcMode;
  iceServers?: RTCIceServer[];
};

export type WebRtcSession = {
  pc: RTCPeerConnection;
  stop: () => void;
};

const defaultIce: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

async function exchangeGo2rtc(
  gateway: string,
  src: string,
  offer: RTCSessionDescriptionInit
): Promise<RTCSessionDescriptionInit> {
  const base = gateway.replace(/\/$/, '');
  const url = `${base}/api/webrtc?src=${encodeURIComponent(src)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: offer.type, sdp: offer.sdp }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`go2rtc 信令失败 ${res.status}${text ? `: ${text}` : ''}`);
  }
  const data = await res.json();
  if (!data?.sdp) {
    throw new Error('go2rtc 未返回 SDP answer');
  }
  return { type: data.type || 'answer', sdp: data.sdp };
}

async function exchangeWhep(
  whepUrl: string,
  offer: RTCSessionDescriptionInit
): Promise<RTCSessionDescriptionInit> {
  const res = await fetch(whepUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
      Accept: 'application/sdp',
    },
    body: offer.sdp || '',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WHEP 信令失败 ${res.status}${text ? `: ${text}` : ''}`);
  }
  const sdp = await res.text();
  if (!sdp) throw new Error('WHEP 未返回 SDP answer');
  return { type: 'answer', sdp };
}

/**
 * 在 video 上播放一路 WebRTC 流，返回 session（可 stop）
 */
export async function playWebRtc(options: WebRtcPlayOptions): Promise<WebRtcSession> {
  const mode = options.mode || 'go2rtc';
  const video = options.video;
  const pc = new RTCPeerConnection({
    iceServers: options.iceServers || defaultIce,
  });

  const stop = () => {
    try {
      pc.getReceivers().forEach((r) => r.track?.stop());
      pc.close();
    } catch {
      /* ignore */
    }
    if (video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
  };

  try {
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = (ev) => {
      if (ev.streams?.[0]) {
        video.srcObject = ev.streams[0];
      } else {
        const stream = video.srcObject as MediaStream | null;
        if (stream) {
          stream.addTrack(ev.track);
        } else {
          video.srcObject = new MediaStream([ev.track]);
        }
      }
      video.play().catch(() => undefined);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 等待 ICE gathering 短暂完成，提升兼容性
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const timer = window.setTimeout(() => resolve(), 1500);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          window.clearTimeout(timer);
          resolve();
        }
      };
    });

    const local = pc.localDescription || offer;
    let answer: RTCSessionDescriptionInit;
    if (mode === 'whep') {
      if (!options.whepUrl) throw new Error('未配置 WHEP 地址');
      answer = await exchangeWhep(options.whepUrl, local);
    } else {
      if (!options.gateway) throw new Error('未配置 WebRtcGateway（go2rtc）');
      if (!options.src) throw new Error('未配置流 src / RTSP');
      answer = await exchangeGo2rtc(options.gateway, options.src, local);
    }
    await pc.setRemoteDescription(answer);
    return { pc, stop };
  } catch (e) {
    stop();
    throw e;
  }
}
