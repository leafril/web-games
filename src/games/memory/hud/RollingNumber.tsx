/** 한 자릿수 릴 — 0~9 를 세로로 쌓고 translateY 로 목표 숫자에 맞춘다. 값이 바뀌면 transition 으로
 *  사이 숫자를 거쳐 굴러간다(슬롯/오도미터 룰렛 효과). 폰트·색은 부모 글자 스타일 상속. */
const DigitReel = ({ digit }: { digit: number }) => {
  return (
    <span
      style={{
        display: "inline-block",
        height: "1em",
        overflow: "hidden",
        verticalAlign: "top",
        // 세로 릴 마스킹용 overflow:hidden 이 inline-block 에선 가로로도 글자 외곽선(stroke)을
        // advance 폭에서 잘라낸다(맨 왼쪽 숫자 왼쪽이 잘려 보임). 좌우 패딩으로 stroke 공간을 주고
        // 같은 만큼 음수 마진으로 자리폭을 되돌려 숫자 간격은 유지한다.
        paddingInline: "0.14em",
        marginInline: "-0.14em",
      }}
    >
      <span
        style={{
          display: "block",
          transform: `translateY(-${digit}em)`,
          transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span
            key={n}
            style={{
              display: "block",
              height: "1em",
              lineHeight: 1,
              // 슬롯 폭은 가장 넓은 숫자(0·8 등) 기준이라, 좁은 "1" 이 왼쪽에 붙어 간격이 달라 보인다.
              // 각 숫자를 슬롯 중앙에 둬 자리 간격을 균일하게.
              textAlign: "center",
            }}
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  );
};

/** 숫자 문자열을 자릿수 릴 + 정적 문자(. K 등)로 렌더 — 숫자만 룰렛으로 굴린다. */
export const RollingNumber = ({ text }: { text: string }) => {
  return (
    <span style={{ display: "inline-flex", verticalAlign: "top" }}>
      {text.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <DigitReel key={i} digit={Number(ch)} />
        ) : (
          <span
            key={i}
            style={{ display: "inline-block", height: "1em", lineHeight: 1 }}
          >
            {ch}
          </span>
        ),
      )}
    </span>
  );
};
