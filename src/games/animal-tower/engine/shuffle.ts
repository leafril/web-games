/** Fisher–Yates 셔플. 입력을 변형하지 않고 새 배열을 반환한다. */
export const shuffle = <T>(input: readonly T[]): T[] => {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
