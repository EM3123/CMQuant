/**
 * Dragons, in the wallpaper of the workbench.
 *
 * Drawn as line art rather than shipped as artwork, for the same reason the
 * playing cards are: an SVG that inherits `currentColor` takes the wing's
 * palette for free, costs no network request, and stays sharp at any size.
 *
 * The style is engraving - uniform stroke, no fill, no shading - because that
 * is what belongs behind a page of numbers. A rendered illustration would sit
 * on top of the product. An engraved dragon reads as the paper the product is
 * printed on, which is the trick a banknote or a bond certificate plays.
 *
 * It is an eastern dragon: a long serpentine body rather than a winged lizard.
 * The shape suits a page margin, and a western dragon needs wing membranes
 * that look wrong unless they are shaded.
 *
 * THE BODY PATH IS GENERATED, NOT HAND-DRAWN. The first attempt placed two
 * curves a constant distance apart, and a constant-width tube with legs on it
 * is a caterpillar - which is exactly what it looked like. The outline below
 * comes from sampling a bezier spine at ninety-six points, offsetting each one
 * along its own normal by a width that tapers from the shoulders to a point at
 * the tail, and closing the loop. The spikes and belly plates ride the same
 * sampling, so they sit on the body rather than near it.
 *
 * Nothing here is a Carnegie Mellon mark. The university's animal is a
 * Scottish terrier and it appears nowhere in this project.
 */

const BODY =
  "M576.6 99.6 L567.4 94.6 L558.3 90.1 L549.1 85.9 L539.9 82.1 L530.8 78.8 L521.6 75.9 L512.4 73.5 L503.2 71.5 L494.1 70.1 L484.9 69.1 L475.9 68.7 L466.9 68.8 L458 69.3 L449.3 70.3 L440.7 71.8 L432.3 73.7 L424.1 76 L416.1 78.7 L408.3 81.8 L400.7 85.1 L393.3 88.8 L386.1 92.8 L379.1 97.1 L372.3 101.6 L365.7 106.3 L359.3 111.3 L353.2 116.6 L347.2 122.1 L341.4 127.8 L335.8 133.8 L330.4 139.9 L325.1 146.4 L321.1 151.5 L317.2 156.5 L313.2 161.3 L309.2 166 L305.1 170.6 L301.1 175 L297 179.3 L293 183.4 L288.9 187.3 L284.8 191.2 L280.7 194.8 L276.6 198.3 L272.4 201.7 L268.3 204.9 L264.1 207.9 L259.9 210.8 L255.6 213.5 L251.4 216 L247.1 218.4 L242.7 220.6 L238.3 222.6 L233.9 224.5 L229.4 226.2 L224.9 227.7 L220.3 229 L215.6 230.2 L210.9 231.2 L206.1 231.9 L201.1 232.5 L196.1 232.9 L191 233.1 L185.8 233.1 L179.2 233 L172.7 233.1 L166.3 233.4 L160 234 L153.8 234.8 L147.7 235.9 L141.8 237.1 L135.9 238.7 L130.2 240.4 L124.6 242.4 L119.2 244.5 L113.8 247 L108.6 249.6 L103.6 252.4 L98.6 255.5 L93.8 258.7 L89.1 262.1 L84.5 265.8 L80.1 269.6 L75.8 273.6 L71.6 277.8 L67.5 282.2 L63.9 287.2 L60.7 292.5 L57.6 297.9 L54.5 303.4 L51.4 308.9 L48.4 314.6 L45.3 320.3 L42.2 326.1 L39.2 332 L36 338 L36 338 L40 332.6 L44.2 327.4 L48.5 322.5 L52.9 318 L57.5 313.7 L62.1 309.7 L66.8 306 L71.6 302.6 L76.5 299.6 L81.1 296.6 L85.3 293.3 L89.5 290.3 L93.8 287.5 L98.1 284.9 L102.4 282.5 L106.7 280.3 L111.1 278.3 L115.4 276.5 L119.8 274.9 L124.3 273.5 L128.8 272.3 L133.3 271.2 L137.9 270.4 L142.5 269.7 L147.2 269.2 L151.9 268.9 L156.8 268.8 L161.7 268.8 L166.7 269.1 L171.8 269.5 L176.9 270.1 L182.2 270.9 L188.9 271.7 L195.6 272.3 L202.2 272.7 L208.8 272.7 L215.4 272.5 L221.9 272 L228.4 271.3 L234.8 270.3 L241.2 269 L247.5 267.5 L253.8 265.8 L260 263.8 L266.1 261.6 L272.2 259.2 L278.2 256.6 L284.1 253.7 L290 250.7 L295.8 247.5 L301.5 244.1 L307.2 240.5 L312.8 236.7 L318.4 232.8 L323.8 228.7 L329.3 224.4 L334.6 220 L339.9 215.5 L345.2 210.8 L350.4 206 L355.6 201.1 L360.7 196.1 L365.8 190.9 L370.9 185.6 L375.1 181.4 L379.5 177.5 L383.9 173.8 L388.4 170.4 L392.9 167.3 L397.5 164.5 L402.1 162 L406.7 159.8 L411.4 157.9 L416.1 156.3 L420.8 154.9 L425.6 153.9 L430.3 153.1 L435.1 152.6 L439.9 152.3 L444.7 152.3 L449.5 152.4 L454.4 152.8 L459.3 153.3 L464.3 153.9 L469.3 154.8 L474.5 155.7 L479.8 156.8 L485.3 158.1 L490.9 159.5 L496.7 161.2 L502.7 163 L508.9 165.1 L515.3 167.5 L521.8 170.1 L528.5 173.1 L535.4 176.4 Z";

const SPIKES =
  "M556.7 89.1 L565.8 62.2 L543.8 83.7 M506 72.1 L509 45.1 L492.2 69.5 M456.2 69.9 L452.6 44.3 L442.2 70.8 M410.4 81.5 L400.6 58.8 L397.2 86 M370.6 103.2 L356 84.9 L358.9 110.9 M336.7 133.1 L319.3 119.4 L327.1 143.3 M312.9 162.3 L296.6 149.2 L303.1 172.3 M290.8 186.2 L276.9 172.2 L280 195 M268.3 205.6 L257.2 190.7 L256.3 212.7 M245 220.2 L237.3 204.6 L231.8 224.9 M219.9 229.9 L215.9 214.1 L206.1 231.6 M191.9 233.7 L191.2 218.7 L177.9 232.5 M156.5 234.7 L152.9 221.2 L142.6 236.3 M124.3 242.8 L118.2 231.5 L111.2 247.5 M95.8 257.8 L87.8 249.1 L84 265.3";

const PLATES =
  "M499.2 158.2 Q503.6 143.6 509.7 123.3 M480.8 153.5 Q483.3 138.6 486.7 117.9 M463.9 150.5 Q464.2 136 464.8 115.6 M447.8 149.2 Q446.2 135.7 443.8 116.3 M432.2 149.9 Q428.9 137.9 423.9 120 M416.8 153.1 Q412.1 142.6 404.9 126.7 M401.7 159.2 Q396 150.2 387 136.2 M387 168.3 Q380.5 160.6 370.2 148.4 M372.9 180.2 Q365.9 173.8 354.5 163.3 M357.6 195.9 Q351 189.8 339.9 179.6 M341.3 211.3 Q335.3 205.2 325.1 194.7 M324.6 225.4 Q319.2 219.2 310 208.5 M307.2 238 Q302.7 231.7 294.5 220.7 M289.3 248.8 Q285.5 242.6 278.6 231.3 M270.7 257.8 Q267.8 251.6 262.2 240 M251.4 264.6 Q249.4 258.6 245.3 246.9 M231.6 269 Q230.4 263.3 227.9 251.6 M211.2 271 Q210.8 265.6 209.8 254.2 M190.4 270.3 Q190.7 265.4 191.2 254.4 M172 268.1 Q172.2 263.6 172.4 253.1 M156.1 267.4 Q155.7 263.5 154.8 253.6 M140.9 268.7 Q140.1 265.3 138.1 256.1 M126.3 271.7 Q125.3 269 122.2 260.6 M112.2 276.7 Q111.1 274.6 107.2 267.1 M98.4 283.6 Q97.4 282.1 92.9 275.7 M84.9 292.6 Q84.1 291.6 79.3 286.2";

/** One dragon, nose to tail, in a 780 x 440 box. */
function Dragon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 780 440"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={BODY} />

      <g strokeWidth={1.6}>
        <path d={SPIKES} />
      </g>

      <g strokeWidth={1} opacity={0.6}>
        <path d={PLATES} />
      </g>

      {/* --- head, starting at the neck the spine leaves off ----------------
          The neck cross-section runs from 576.6,99.6 down to 535.4,176.4, and
          the head is built off those two points so it joins the body instead
          of floating beside it. Lowered, facing down-right, with the back
          arching up behind it.

          Everything from here down is hand-drawn. Geometry gets you a
          convincing body and none at all of a face. */}
      <path d="M576.6 99.6 C616 106 654 128 686 156 C702 170 714 180 726 186" />
      <path d="M726 186 C734 192 732 200 722 202 C700 205 674 200 652 192" />
      <path d="M652 192 C666 206 686 218 680 230 C660 232 630 220 612 202" />
      <path d="M612 202 C588 196 560 188 535.4 176.4" />

      {/* brow, eye, nostril */}
      <path d="M608 128 C620 122 636 125 646 136" strokeWidth={1.4} />
      <circle cx={627} cy={141} r={5} fill="currentColor" stroke="none" />
      <path d="M708 180 C713 176 719 178 721 183" strokeWidth={1.2} />

      {/* Two teeth. Any more and it stops being an engraving. */}
      <g strokeWidth={1.2}>
        <path d="M690 197 L686 208" />
        <path d="M666 194 L663 205" />
      </g>

      {/* Horns, rising off the brow and curving back over the snout. They go
          forward rather than back because the body arches over the neck, and
          a horn drawn into that arc just reads as another rib. */}
      <path d="M604 104 C616 72 650 54 684 57 C656 66 632 86 624 114" strokeWidth={1.5} />
      <path d="M584 103 C591 76 612 58 638 52" strokeWidth={1.2} />

      {/* Barbels off the snout, and the mane behind the jaw. These two details
          are most of what separates a dragon from a lizard. */}
      <path d="M729 199 C752 218 748 252 722 268" strokeWidth={1.2} />
      <path d="M716 206 C730 226 720 252 698 261" strokeWidth={1.2} />
      <g strokeWidth={1.2} opacity={0.85}>
        <path d="M618 208 C606 230 582 242 556 240" />
        <path d="M596 199 C580 219 556 228 530 226" />
        <path d="M572 188 C556 204 534 211 512 209" />
      </g>

      {/* --- limbs -----------------------------------------------------
          Short and reaching, not long and hanging. The first version drew
          them as long tapering tubes with fringe on the end, and four of
          those under a serpentine body reads as an iguana. A stubby limb with
          three clear claws is what an engraver would cut, and it survives
          being shrunk to wallpaper. */}
      <g strokeWidth={1.5}>
        {/* front, off the shoulder at 441,141 */}
        <path d="M424 140 C442 168 462 184 486 190" />
        <path d="M460 134 C472 160 486 174 506 179" />
        <path d="M486 190 C494 196 502 195 506 179" />
        <path d="M506 179 L524 172 M502 187 L521 187 M496 193 L510 202" />

        {/* back, off the haunch at 211,266 */}
        <path d="M191 262 C200 292 214 310 238 318" />
        <path d="M230 258 C242 284 254 298 274 304" />
        <path d="M238 318 C248 322 258 319 274 304" />
        <path d="M274 304 L292 300 M272 311 L290 314 M265 317 L277 328" />
      </g>

      {/* --- tail tuft ------------------------------------------------------ */}
      <g strokeWidth={1.5}>
        <path d="M36 338 C18 350 6 372 4 397 C16 383 28 375 41 373" />
        <path d="M36 338 C33 359 25 377 11 391" />
        <path d="M42 342 C51 361 51 381 41 399" />
      </g>
    </svg>
  );
}

/**
 * The layer itself. Three dragons at different sizes, one mirrored, arranged
 * so no two heads sit near each other and the middle of the screen - where the
 * questions go - stays empty.
 */
export function DragonField() {
  return (
    <div className="dragon-field" aria-hidden>
      <div className="dragon-drift absolute inset-0">
        <Dragon className="absolute -left-[8%] -top-[6%] w-[64%] max-w-[820px] -rotate-6" />
        <Dragon className="absolute -right-[12%] top-[36%] w-[58%] max-w-[760px] scale-x-[-1] rotate-3" />
        <Dragon className="absolute -bottom-[10%] left-[6%] hidden w-[50%] max-w-[640px] rotate-2 md:block" />
      </div>
    </div>
  );
}
