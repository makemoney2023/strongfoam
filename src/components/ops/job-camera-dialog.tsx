"use client";

import { CameraIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCapturedPhotoFile } from "@/lib/ops/job-workspace";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function JobCameraDialog({
  open,
  onOpenChange,
  onCapture,
  onUnavailable,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  onUnavailable: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      stopStream(streamRef.current);
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    void navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      .then(async (stream) => {
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
      })
      .catch(() => {
        if (!cancelled) onUnavailable();
      });

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [open, onUnavailable]);

  async function captureStill() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        onUnavailable();
        return;
      }
      context.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });
      if (!blob) {
        onUnavailable();
        return;
      }
      onCapture(createCapturedPhotoFile(blob));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          stopStream(streamRef.current);
          streamRef.current = null;
          setReady(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-w-lg overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Take a photo</DialogTitle>
          <DialogDescription>
            Use the device camera, then snap a still for this job.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-[3/4] w-full object-cover sm:aspect-video"
            onPlaying={() => setReady(true)}
          />
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-11 min-w-36"
            disabled={!ready || busy}
            onClick={() => void captureStill()}
          >
            {busy || !ready ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
            ) : (
              <CameraIcon aria-hidden="true" />
            )}
            {ready ? "Snap photo" : "Starting camera…"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
