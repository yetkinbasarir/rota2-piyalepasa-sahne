/* [data-fit] öğelerinin puntosunu, kapsayıcısının iç genişliğini tam dolduracak şekilde ayarlar.
   Öğe oluşturulurken bir kez ölçülür (transform ölçüyü etkilemez); fontlar yüklenince yeniden kurulur. */
export function fitText(root: Element) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-fit]')) {
    const box = el.parentElement;
    if (!box) continue;
    const cs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const w = el.offsetWidth;
    if (avail <= 0 || w <= 0) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = `${((fs * avail) / w).toFixed(2)}px`;
  }
}
