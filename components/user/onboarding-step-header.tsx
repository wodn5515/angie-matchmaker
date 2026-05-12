import * as React from "react";
import { Stepper, type StepperStep } from "@/components/ui/stepper";

/**
 * 온보딩 multi-step 페이지 상단의 step 표시 + 제목 + 부제.
 * `/onboarding/profile`, `/onboarding/preferences`, `/onboarding/survey` 공용.
 *
 * 가입자가 자기가 어디 와 있는지 + 다음에 뭐가 있는지 직관적으로 보게 한다.
 */
const DEFAULT_STEPS: StepperStep[] = [
  { label: "내 프로필" },
  { label: "이상형", optional: true },
  { label: "성향 테스트", optional: true },
];

export function OnboardingStepHeader({
  currentIndex,
  title,
  subtitle,
  emoji,
  steps = DEFAULT_STEPS,
}: {
  currentIndex: number;
  title: string;
  subtitle?: string;
  emoji?: string;
  steps?: StepperStep[];
}) {
  return (
    <div className="space-y-6">
      <Stepper steps={steps} currentIndex={currentIndex} />
      <div className="text-center">
        {emoji ? <div className="text-4xl">{emoji}</div> : null}
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-[var(--color-fg-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
