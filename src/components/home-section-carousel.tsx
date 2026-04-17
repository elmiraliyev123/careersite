"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

type HomeSectionCarouselProps = {
  slides: Array<{ key: string; content: ReactNode }>;
  ariaLabel: string;
  viewportClassName: string;
};

export function HomeSectionCarousel({
  slides,
  ariaLabel,
  viewportClassName
}: HomeSectionCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resumeAtRef = useRef(0);
  const hoverRef = useRef(false);
  const pointerDownRef = useRef(false);
  const scrollByDirectionRef = useRef<(direction: 1 | -1, behavior?: ScrollBehavior) => void>(() => {});
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    moved: false
  });
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  function getStep(container: HTMLDivElement) {
    const firstSlide = container.querySelector<HTMLElement>("[data-home-carousel-slide='true']");
    const gapValue = window.getComputedStyle(container).columnGap || window.getComputedStyle(container).gap;
    const gap = Number.parseFloat(gapValue) || 16;

    return (firstSlide?.offsetWidth ?? 0) + gap;
  }

  function holdAutoplay(delayMs = 2600) {
    resumeAtRef.current = Date.now() + delayMs;
  }

  scrollByDirectionRef.current = (direction: 1 | -1, behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const step = getStep(container);

    if (step <= 0) {
      return;
    }

    const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);

    if (maxScroll <= 8) {
      return;
    }

    const currentLeft = container.scrollLeft;
    let nextLeft = currentLeft + step * direction;

    if (direction === 1 && nextLeft >= maxScroll - 8) {
      nextLeft = 0;
    } else if (direction === -1 && currentLeft <= 8) {
      nextLeft = maxScroll;
    } else {
      nextLeft = Math.max(0, Math.min(nextLeft, maxScroll));
    }

    container.scrollTo({ left: nextLeft, behavior });
  };

  useEffect(() => {
    if (slides.length < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (hoverRef.current || pointerDownRef.current || Date.now() < resumeAtRef.current) {
        return;
      }

      scrollByDirectionRef.current(1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [slides.length]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button, input, select, textarea")) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    pointerDownRef.current = true;
    setIsDragging(true);
    holdAutoplay();

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
      moved: false
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const container = containerRef.current;

    if (!container || !pointerDownRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const delta = event.clientX - dragRef.current.startX;
    if (Math.abs(delta) > 6) {
      dragRef.current.moved = true;
      suppressClickRef.current = true;
    }
    container.scrollLeft = dragRef.current.startScrollLeft - delta;
  }

  function finishPointerInteraction(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current.pointerId === event.pointerId) {
    dragRef.current.pointerId = -1;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 120);
    }

    pointerDownRef.current = false;
    setIsDragging(false);
    holdAutoplay();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="home-section-carousel">
      <div className="home-section-carousel__controls" aria-label={`${ariaLabel} controls`}>
        <button
          type="button"
          className="home-section-carousel__control"
          onClick={() => {
            holdAutoplay();
            scrollByDirectionRef.current(-1);
          }}
          aria-label={`Previous ${ariaLabel.toLowerCase()}`}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          className="home-section-carousel__control"
          onClick={() => {
            holdAutoplay();
            scrollByDirectionRef.current(1);
          }}
          aria-label={`Next ${ariaLabel.toLowerCase()}`}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div
        ref={containerRef}
        className={`home-section-carousel__viewport ${viewportClassName}${isDragging ? " home-section-carousel__viewport--dragging" : ""}`}
        aria-label={ariaLabel}
        onMouseEnter={() => {
          hoverRef.current = true;
        }}
        onMouseLeave={() => {
          hoverRef.current = false;
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerInteraction}
        onPointerCancel={finishPointerInteraction}
      >
        {slides.map((slide) => (
          <div
            key={slide.key}
            className="home-section-carousel__slide"
            data-home-carousel-slide="true"
            onClickCapture={(event) => {
              if (suppressClickRef.current) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            {slide.content}
          </div>
        ))}
      </div>
    </div>
  );
}
