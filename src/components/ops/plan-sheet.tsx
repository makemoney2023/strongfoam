"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { isPlanPdfContentType } from "@/lib/ops/plan-markup";

export type PlanSheetHandle = {
  capturePng: () => Promise<string | null>;
  aspect: number;
};

export const PlanSheet = forwardRef<
  PlanSheetHandle,
  {
    src: string;
    contentType: string;
    pageNumber: number;
    onPageCount: (count: number) => void;
    children: React.ReactNode;
  }
>(function PlanSheet(
  { src, contentType, pageNumber, onPageCount, children },
  ref,
) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [aspect, setAspect] = useState(1);
  const isPdf = isPlanPdfContentType(contentType);

  useImperativeHandle(
    ref,
    () => ({
      aspect,
      capturePng: async () => {
        if (isPdf && canvasRef.current) {
          return canvasRef.current.toDataURL("image/png");
        }
        const image = imageRef.current;
        if (!image) return null;
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/png");
      },
    }),
    [aspect, isPdf],
  );

  useEffect(() => {
    if (!isPdf) {
      onPageCount(1);
      setPdfError(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    setPdfError(null);
    void renderPdfPage(src, pageNumber, canvas)
      .then((count) => {
        if (cancelled) return;
        onPageCount(count);
        setAspect(canvas.width / Math.max(canvas.height, 1));
      })
      .catch(() => {
        if (!cancelled) {
          setPdfError("This PDF could not be drawn on the sheet.");
          onPageCount(1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isPdf, onPageCount, pageNumber, src]);

  return (
    <div className="relative mx-auto block min-w-full touch-pan-x touch-pan-y">
      {isPdf ? (
        <>
          <canvas
            ref={canvasRef}
            className="block h-auto w-full max-w-none select-none"
          />
          {pdfError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4 text-sm text-muted-foreground">
              <div className="space-y-3 text-center">
                <p>{pdfError}</p>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={src} />}
                >
                  Open PDF
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          src={src}
          alt="Job plan"
          className="block h-auto w-full max-w-none select-none"
          draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget;
            setAspect(image.naturalWidth / Math.max(image.naturalHeight, 1));
          }}
        />
      )}
      {children}
    </div>
  );
});

async function renderPdfPage(
  src: string,
  pageNumber: number,
  canvas: HTMLCanvasElement,
) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const response = await fetch(src);
  if (!response.ok) throw new Error("pdf fetch failed");
  const data = await response.arrayBuffer();
  const document = await pdfjs.getDocument({ data }).promise;
  const page = await document.getPage(
    Math.min(Math.max(pageNumber, 1), document.numPages),
  );
  const viewport = page.getViewport({ scale: 1.6 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas missing");
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return document.numPages;
}
