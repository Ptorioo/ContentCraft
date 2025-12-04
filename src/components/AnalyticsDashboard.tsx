import React from "react";
import { AnalyticsDataset } from "../types/index";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface AnalyticsDashboardProps {
  data: AnalyticsDataset;
  onBackToChat: () => void;
}

const ScatterTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item =
    payload.find((it: any) => it?.payload?.name === "Your input") ?? payload[0];

  const point = item?.payload;
  if (!point) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-md px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-gray-900 mb-1">{point.name}</div>
      <div>Novelty: {Number(point.x).toFixed(2)}</div>
      <div>Diversity: {Number(point.y).toFixed(2)}</div>
      <div>ATI: {Number(point.ati).toFixed(1)}</div>
    </div>
  );
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  const scatterData = data.noveltyDiversityScatter.map((brand) => ({
    x: brand.novelty,
    y: brand.diversity,
    z: brand.ati,
    name: brand.brandName,
    ati: brand.ati,
    postCount: brand.postCount,
    followerCount: brand.followerCount,
  }));

  const userPoints = scatterData.filter((p) => p.name === "Your input");
  const samplePoints = scatterData.filter((p) => p.name !== "Your input");

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-2xl py-4 space-y-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Novelty × Diversity 分佈（抽樣）
          </h3>

          <div className="aspect-[4/3] bg-gray-100 rounded-lg mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 30, right: 20, bottom: 30, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Novelty"
                  domain={[0, 1]}
                  tickFormatter={(v) => v.toFixed(2)}
                  label={{
                    value: "Novelty",
                    position: "insideBottom",
                    offset: -10,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Diversity"
                  domain={[0, 1]}
                  tickFormatter={(v) => v.toFixed(2)}
                  label={{
                    value: "Diversity",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <ZAxis type="number" dataKey="z" name="ATI" range={[80, 200]} />
                <Tooltip content={<ScatterTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ top: 0 }}
                />
                <Scatter name="品牌樣本" data={samplePoints} />
                <Scatter name="Your input" data={userPoints} fill="#ef4444" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
