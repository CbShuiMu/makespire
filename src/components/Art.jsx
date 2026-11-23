import { useId } from "react";
import {
  Boxes,
  FlaskConical,
  Gem,
  Layers3,
  LayoutGrid,
  Sparkles,
  UserRound,
  FolderOpen,
  House,
} from "lucide-react";

export function Icon({ name, ...props }) {
  const Component =
    {
      character: UserRound,
      cards: Layers3,
      relic: Gem,
      potion: FlaskConical,
      project: FolderOpen,
      home: House,
      sparkles: Sparkles,
      grid: LayoutGrid,
      boxes: Boxes,
    }[name] || Sparkles;
  return (
    <Component size={20} strokeWidth={1.65} aria-hidden="true" {...props} />
  );
}

export function Artwork({ type = "sword", color = "ember", className = "" }) {
  const id = useId().replaceAll(":", "");
  const colors =
    color === "forest"
      ? ["#0e3435", "#296454", "#72c28e", "#d9e8ae"]
      : color === "violet"
        ? ["#231e45", "#534777", "#b08be5", "#f3c6f6"]
        : ["#321e32", "#733e44", "#e39b61", "#ffe0a1"];
  return (
    <svg
      className={className}
      viewBox="0 0 400 320"
      role="img"
      aria-label={
        {
          sword: "余烬环绕的剑刃",
          flame: "燃烧的魔法火焰",
          forest: "月光下的幽林",
          character: "披着斗篷的冒险者",
          relic: "悬浮的魔法晶石",
          potion: "盛着魔法药剂的玻璃瓶",
        }[type]
      }
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="58%" cy="40%" r="75%">
          <stop stopColor={colors[1]} />
          <stop offset="1" stopColor={colors[0]} />
        </radialGradient>
        <linearGradient id={`${id}-light`} x1="0" y1="1" x2=".7" y2="0">
          <stop stopColor={colors[2]} />
          <stop offset="1" stopColor={colors[3]} />
        </linearGradient>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <pattern
          id={`${id}-grain`}
          width="23"
          height="29"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="3" cy="7" r=".8" fill="white" opacity=".08" />
          <circle cx="19" cy="21" r="1" fill="white" opacity=".05" />
        </pattern>
      </defs>
      <path fill={`url(#${id}-bg)`} d="M0 0h400v320H0z" />
      <circle
        cx="210"
        cy="138"
        r="82"
        fill={colors[2]}
        opacity=".12"
        filter={`url(#${id}-glow)`}
      />
      <g fill="none" stroke={colors[2]} opacity=".15">
        <circle cx="210" cy="145" r="101" />
        <circle cx="210" cy="145" r="110" />
        <path d="M80 145h260M210 25v240M110 50l200 190M110 240 310 50" />
      </g>
      <path
        fill={colors[0]}
        opacity=".6"
        d="m0 231 48-36 26 22 49-35 49 52 49-19 35 32 62-58 82 35v96H0z"
      />
      {(type === "sword" || type === "flame") && (
        <>
          <path
            d="M145 259c-61-54 7-89 10-132 40 39-19 70 14 79 48-26 16-86 58-134-4 39 52 52 29 91 59-25 49-75 67-96 32 100-38 123-55 158-18 40-66 61-123 34Z"
            fill={colors[2]}
            opacity=".25"
          />
          <path
            d="M171 255c-29-30 5-53 12-80 21 18 1 34 13 40 39-20 48-58 43-87 35 36 1 73-10 88 28-2 39-23 48-46 10 69-57 114-106 85Z"
            fill={colors[2]}
            opacity=".7"
          />
          {type === "sword" ? (
            <g transform="rotate(30 205 155)">
              <path
                d="m205 24-23 44 8 120h30l8-120Z"
                fill="#e7d4b2"
                stroke="#3e2739"
                strokeWidth="6"
              />
              <path d="m205 24 0 164h15l8-120Z" fill="#b79a87" />
              <path d="m205 58-5 113 6 10 5-110Z" fill="#fff4c2" />
              <path
                d="m165 176 23 11 33-1 24-10-4 23-24-2-24 1-24 8Z"
                fill="#d6a264"
                stroke="#482d3c"
                strokeWidth="5"
              />
              <path
                d="m194 199 3 55 17 1 2-57"
                fill="#58414b"
                stroke="#b58d60"
                strokeWidth="5"
              />
              <path
                d="m194 215 22 9m-21 5 20 9"
                stroke="#b58d60"
                strokeWidth="4"
              />
              <path d="m195 253-7 13 18 13 18-13-8-12Z" fill="#e3b479" />
            </g>
          ) : (
            <path
              d="M202 249c-51-27-16-65-12-86 19 8 15 29 15 29 17-21 26-45 23-73 44 60 37 104-26 130Z"
              fill={`url(#${id}-light)`}
            />
          )}
        </>
      )}
      {type === "forest" && (
        <>
          <circle cx="230" cy="82" r="36" fill="#e4e9bb" opacity=".8" />
          <g fill="#142e30">
            <path d="m65 0 18 129-17 191H38l18-176L25 0Zm74 0 5 150-19 170h-25l29-180-20-140Zm188 0-25 140 22 180h31l-32-184L356 0Z" />
            <path d="m69 130 67-63-7 27-54 55m59 29 65-63-17 34-49 55m178-87-52-53 11 31 50 48" />
          </g>
          <path d="m160 320 80-132-24 85 38 47" fill="#77ac95" opacity=".3" />
          <g fill="#bed99b">
            <circle cx="165" cy="162" r="3" />
            <circle cx="262" cy="182" r="3" />
            <circle cx="215" cy="222" r="2" />
          </g>
        </>
      )}
      {type === "character" && (
        <g>
          <path
            d="m105 302 39-147 28-15 8-48 30-29 40 29 7 52 26 21 42 137Z"
            fill="#242332"
            stroke={colors[2]}
            strokeWidth="2"
          />
          <path d="m180 92 30-29 40 29-8 39-58 2Z" fill={colors[1]} />
          <path d="m187 101 24-14 28 15-10 29h-32Z" fill="#151d2b" />
          <path d="m200 111 10 2m9 0 10-2" stroke={colors[3]} strokeWidth="3" />
          <path
            d="m144 155 51 20-43 111-47 16m151-156-39 31 65 125h42"
            fill={colors[1]}
          />
          <path d="m195 175 18 125h-61Zm23 2 65 125h-70Z" fill={colors[0]} />
          <path
            d="m144 155 52 22 60-31-18 39-35 8-52-17Z"
            fill={colors[2]}
            opacity=".75"
          />
          <path d="m260 211 21-85 10-11 0 20-21 78Z" fill={colors[3]} />
          <path
            d="m249 211 34 9m-21-8-8 36"
            stroke={colors[2]}
            strokeWidth="7"
          />
        </g>
      )}
      {type === "relic" && (
        <g>
          <ellipse
            cx="201"
            cy="264"
            rx="59"
            ry="10"
            fill="#131a26"
            opacity=".55"
          />
          <path
            d="m197 51 60 61-14 99-46 39-48-42-11-96Z"
            fill={colors[2]}
            stroke={colors[3]}
            strokeWidth="3"
          />
          <path d="m197 51-17 93 17 106 22-106Z" fill={colors[3]} />
          <path
            d="m138 112 42 32 17-93Zm81 32 38-32-14 99-46 39Z"
            fill={colors[1]}
          />
          <path d="m147 192 50 34 51-37-5 22-46 41-48-44Z" fill="#c6a578" />
          <path
            d="m139 114 41 32 39-2 37-31"
            fill="none"
            stroke={colors[3]}
            strokeWidth="2"
          />
        </g>
      )}
      {type === "potion" && (
        <g>
          <ellipse
            cx="203"
            cy="275"
            rx="60"
            ry="10"
            fill="#111c26"
            opacity=".4"
          />
          <path
            d="M180 91v46c-62 35-67 106-22 124 24 9 66 9 90-2 42-21 30-91-24-122V91"
            fill="#e4f3e2"
            fillOpacity=".13"
            stroke="#dac9ba"
            strokeWidth="5"
          />
          <path
            d="M152 190c-23 47 6 68 49 68s74-21 50-68c-27 14-70-14-99 0Z"
            fill={colors[2]}
          />
          <ellipse cx="201" cy="190" rx="49" ry="10" fill={colors[3]} />
          <path
            d="m176 72 51 1-5 28h-42Z"
            fill="#aa7f57"
            stroke="#513e3d"
            strokeWidth="4"
          />
          <path d="M174 108h55" stroke="#e6d3b5" strokeWidth="9" />
          <path
            d="m162 167-11 24-4 27"
            fill="none"
            stroke="white"
            strokeWidth="5"
            opacity=".5"
            strokeLinecap="round"
          />
          <circle cx="208" cy="221" r="6" fill={colors[3]} opacity=".7" />
          <circle cx="187" cy="234" r="3" fill={colors[3]} />
        </g>
      )}
      <g fill={colors[3]} opacity=".7">
        <path d="m85 74 2-6 2 6 6 2-6 2-2 6-2-6-6-2Zm221 137 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" />
        <circle cx="111" cy="220" r="2" />
        <circle cx="288" cy="88" r="2" />
        <circle cx="265" cy="266" r="2" />
        <circle cx="170" cy="37" r="1.5" />
      </g>
      <path fill={`url(#${id}-grain)`} d="M0 0h400v320H0z" />
    </svg>
  );
}

export function GameCard({ item, className = "" }) {
  const frame =
    item.cardType === "技能"
      ? "skill"
      : item.cardType === "能力"
        ? "power"
        : "attack";
  return (
    <div
      className={`game-card ${className} theme-${item.color}`}
      role="group"
      aria-label={`${item.name}，${item.cost} 费${item.cardType}`}
    >
      <Artwork type={item.art} color={item.color} className="game-card-art" />
      <img
        src={`/assets/frames/${frame}.png`}
        className="game-card-frame"
        alt=""
      />
      <span className="game-card-cost">{item.cost}</span>
      <p className="game-card-title">{item.name || "未命名卡牌"}</p>
      <span className="game-card-type">
        {item.cardType} · {item.rarity}
      </span>
      <p className="game-card-description">
        {item.description || "在左侧写下你的卡牌效果。"}
      </p>
      <span className="game-card-flavor">{item.subtitle}</span>
    </div>
  );
}
