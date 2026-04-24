"use client";

const NODE_W  = 96;
const NODE_H  = 40;
const ARROW_W = 20;
const VIEW_H  = 60;

type Lines = string[];

interface FlowConfig {
  accent: string;
  nodes: Lines[];
}

const FLOWS: Record<string, FlowConfig> = {
  didianolue: {
    accent: '#4A7FC1',
    nodes: [
      ['Content /', 'LinkedIn'],
      ['Enquiry', 'form'],
      ['Discovery', 'call'],
      ['Contract', 'signed'],
      ['£/day'],
    ],
  },
  masteryourcareerpath: {
    accent: '#F5A623',
    nodes: [
      ['Free Skool'],
      ['Newsletter'],
      ['Webinar'],
      ['£47/mo or', '£325 course'],
    ],
  },
  theconcurrentcontractor: {
    accent: '#FFD700',
    nodes: [
      ['Article /', 'CHAOS'],
      ['Newsletter'],
      ['Workshop'],
      ['£89'],
    ],
  },
  oldoaktown: {
    accent: '#4C8A35',
    nodes: [
      ['Local', 'content'],
      ['Followers'],
      ['Newsletter'],
      ['Directory', 'listing'],
      ['Exit / sale'],
    ],
  },
  aiviralvideoprompts: {
    accent: '#4ecdc4',
    nodes: [
      ['Social post'],
      ['Gumroad', 'page'],
      ['Purchase'],
      ['Email list'],
      ['Upsell'],
    ],
  },
};

function NodeBox({
  x, y, lines, accent, isLast,
}: { x: number; y: number; lines: Lines; accent: string; isLast: boolean }) {
  const fill      = isLast ? accent : `${accent}1a`;
  const textColor = isLast ? '#fff' : accent;
  const midY      = y + NODE_H / 2;
  const weight    = isLast ? '600' : '400';

  return (
    <g>
      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={5}
        fill={fill} stroke={accent} strokeWidth={1.2} />
      {lines.length === 1 ? (
        <text x={x + NODE_W / 2} y={midY + 3.5}
          textAnchor="middle" fontSize={8}
          fill={textColor} fontFamily="ui-sans-serif,system-ui,sans-serif" fontWeight={weight}>
          {lines[0]}
        </text>
      ) : (
        <>
          <text x={x + NODE_W / 2} y={midY - 4}
            textAnchor="middle" fontSize={8}
            fill={textColor} fontFamily="ui-sans-serif,system-ui,sans-serif" fontWeight={weight}>
            {lines[0]}
          </text>
          <text x={x + NODE_W / 2} y={midY + 7}
            textAnchor="middle" fontSize={8}
            fill={textColor} fontFamily="ui-sans-serif,system-ui,sans-serif" fontWeight={weight}>
            {lines[1]}
          </text>
        </>
      )}
    </g>
  );
}

function Arrow({ x, nodeY, accent }: { x: number; nodeY: number; accent: string }) {
  const mid = nodeY + NODE_H / 2;
  return (
    <g>
      <line x1={x} y1={mid} x2={x + ARROW_W - 5} y2={mid}
        stroke={accent} strokeWidth={1.5} />
      <polygon
        points={`${x + ARROW_W - 5},${mid - 3} ${x + ARROW_W},${mid} ${x + ARROW_W - 5},${mid + 3}`}
        fill={accent} />
    </g>
  );
}

export default function RevenueFlow({ siteId }: { siteId: string }) {
  const flow = FLOWS[siteId];
  if (!flow) return null;

  const { accent, nodes } = flow;
  const padX   = 4;
  const totalW = nodes.length * NODE_W + (nodes.length - 1) * ARROW_W;
  const viewW  = totalW + 2 * padX;
  const nodeY  = (VIEW_H - NODE_H) / 2;

  return (
    <svg viewBox={`0 0 ${viewW} ${VIEW_H}`} className="w-full h-auto" role="img" aria-label={`${siteId} revenue flow`}>
      {nodes.map((lines, i) => {
        const x = padX + i * (NODE_W + ARROW_W);
        return (
          <g key={i}>
            <NodeBox x={x} y={nodeY} lines={lines} accent={accent} isLast={i === nodes.length - 1} />
            {i < nodes.length - 1 && <Arrow x={x + NODE_W} nodeY={nodeY} accent={accent} />}
          </g>
        );
      })}
    </svg>
  );
}
