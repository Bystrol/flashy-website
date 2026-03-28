import chipsImg from "@assets/chips.png";
import lightningBolt from "@assets/lightning-bolt.svg";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "1.",
    title: "Discovery & Planning",
    description:
      "We start by understanding your business goals, technical requirements, and users. This phase defines scope, priorities, and success metrics.",
  },
  {
    number: "2.",
    title: "Architecture & Design",
    description:
      "We design scalable system architecture and intuitive UI/UX, aligning technical decisions with your business requirements and future growth.",
  },
  {
    number: "3.",
    title: "Development & Testing",
    description:
      "We build your product iteratively with rigorous testing at every stage, ensuring quality, performance, and reliability across all devices.",
  },
  {
    number: "4.",
    title: "Launch & Optimization",
    description:
      "We deploy your product and continuously monitor, optimize, and iterate based on real user data and performance metrics.",
  },
];

const EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
const DURATION = "0.5s";

export default function ProcessCards() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPlayEnabled = useRef(true);

  const handleCardClick = (index: number) => {
    setActiveIndex(index);
    autoPlayEnabled.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && autoPlayEnabled.current) {
          observer.disconnect();
          timerRef.current = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % steps.length);
          }, 5000);
        }
      },
      { threshold: 0.3 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => {
      observer.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div ref={sectionRef} className="z-10 flex w-full items-stretch gap-[22px]">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        return (
          <div
            key={index}
            onClick={() => handleCardClick(index)}
            className="border-grey-grey-30 relative flex h-[425px] cursor-pointer flex-col justify-between overflow-hidden rounded-[12px] border-2 px-[25px] py-[30px] select-none"
            style={{
              flex: isActive ? "0 0 575px" : "1 1 0px",
              transition: `flex-basis ${DURATION} ${EASING}, flex-grow ${DURATION} ${EASING}`,
            }}
          >
            {/* Inactive background */}
            <div
              className="absolute inset-0"
              style={{ background: "var(--color-grey-grey-5)" }}
            />

            {/* Active background overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(147deg, rgba(255,255,255,0) 42%, rgba(175,84,255,0.6) 98%), linear-gradient(90deg, rgba(81,81,81,0.05) 0%, rgba(81,81,81,0.05) 100%)",
                opacity: isActive ? 1 : 0,
                transition: `opacity ${DURATION} ${EASING}`,
              }}
            />

            {/* Chips image */}
            <div
              className="pointer-events-none absolute"
              style={{
                width: "1209px",
                height: "603px",
                left: "-177px",
                top: "-368px",
                transform: isActive ? "scale(1)" : "scale(0)",
                transformOrigin: "top center",
                transition: `transform 0.4s ${EASING}`,
              }}
            >
              <img
                src={chipsImg.src}
                alt=""
                className="block size-full max-w-none object-cover"
              />
            </div>

            {/* Number */}
            <p
              className="text-h2 font-weight-h2 relative z-10 m-0 leading-[--text-h2--line-height] tracking-[--text-h2--letter-spacing]"
              style={{
                color: isActive
                  ? "var(--color-dark-purple)"
                  : "var(--color-black-black-20)",
                transition: `color ${DURATION} ${EASING}`,
              }}
            >
              {step.number}
            </p>

            {/* Bottom content */}
            <div className="relative z-10 flex flex-col gap-[10px]">
              <img
                src={lightningBolt.src}
                alt=""
                className="h-[21px] w-[11px] shrink-0"
              />

              {/* Active: title + description */}
              <div
                style={{
                  maxHeight: isActive ? "200px" : "0px",
                  opacity: isActive ? 1 : 0,
                  overflow: "hidden",
                  transition: `max-height ${DURATION} ${EASING}, opacity ${DURATION} ${EASING}`,
                }}
              >
                <div className="flex flex-col gap-3">
                  <h3 className="text-h4 font-weight-h4 text-black-black m-0 leading-[--text-h4--line-height]">
                    {step.title}
                  </h3>
                  <p className="text-body font-weight-body text-black-black-80 m-0 w-[404px] leading-[--text-body--line-height] tracking-[--text-body--letter-spacing]">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Inactive: title only */}
              <div
                style={{
                  maxHeight: isActive ? "0px" : "60px",
                  opacity: isActive ? 0 : 1,
                  overflow: "hidden",
                  transition: `max-height ${DURATION} ${EASING}, opacity ${DURATION} ${EASING}`,
                }}
              >
                <p className="text-links font-weight-links text-black-black m-0 leading-[--text-links--line-height]">
                  {step.title}
                </p>
              </div>
            </div>

            {/* Inset shadow */}
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_-1px_19.6px_0px_rgba(255,255,255,0.12)]" />
          </div>
        );
      })}
    </div>
  );
}
