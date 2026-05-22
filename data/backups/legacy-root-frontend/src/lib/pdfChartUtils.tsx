import React from 'react';
import ReactDOM from 'react-dom/client';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Chart colors
const COLORS = ['#228B22', '#DAA520', '#8B4513', '#2E8B57', '#CD853F', '#556B2F', '#D2691E', '#6B8E23'];

// Types for chart data
export interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

// Render a chart to base64 image
async function renderChartToImage(
  chartElement: React.ReactElement,
  width: number = 600,
  height: number = 300
): Promise<string | null> {
  return new Promise((resolve) => {
    // Create a container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.backgroundColor = '#ffffff';
    document.body.appendChild(container);

    // Render the chart
    const root = ReactDOM.createRoot(container);
    root.render(chartElement);

    // Wait for rendering then capture
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
        });
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        console.error('Failed to render chart:', error);
        resolve(null);
      } finally {
        root.unmount();
        document.body.removeChild(container);
      }
    }, 500);
  });
}

// Sales Bar Chart
export async function renderSalesBarChart(data: ChartDataItem[]): Promise<string | null> {
  const chartElement = (
    <div style={{ width: 600, height: 300, padding: 20, backgroundColor: '#fff' }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#333', fontFamily: 'Arial, sans-serif' }}>
        Sales by Product
      </h3>
      <BarChart width={560} height={250} data={data.slice(0, 8)}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 10, fill: '#666' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={{ fontSize: 10, fill: '#666' }} />
        <Tooltip />
        <Bar dataKey="value" fill="#228B22" radius={[4, 4, 0, 0]} />
      </BarChart>
    </div>
  );
  return renderChartToImage(chartElement, 600, 320);
}

// Pie Chart for distribution
export async function renderPieChart(
  data: ChartDataItem[],
  title: string
): Promise<string | null> {
  const chartElement = (
    <div style={{ width: 500, height: 300, padding: 20, backgroundColor: '#fff' }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#333', fontFamily: 'Arial, sans-serif' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <PieChart width={280} height={240}>
          <Pie
            data={data.slice(0, 8)}
            cx={140}
            cy={120}
            innerRadius={50}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.slice(0, 8).map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
        <div style={{ marginLeft: 10, fontSize: 11, fontFamily: 'Arial, sans-serif' }}>
          {data.slice(0, 8).map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: COLORS[index % COLORS.length],
                  marginRight: 6,
                  borderRadius: 2,
                }}
              />
              <span style={{ color: '#333' }}>
                {item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return renderChartToImage(chartElement, 500, 300);
}

// Line Chart for trends
export async function renderLineChart(
  data: ChartDataItem[],
  title: string,
  dataKeys: string[] = ['value']
): Promise<string | null> {
  const chartElement = (
    <div style={{ width: 600, height: 300, padding: 20, backgroundColor: '#fff' }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#333', fontFamily: 'Arial, sans-serif' }}>
        {title}
      </h3>
      <LineChart width={560} height={240} data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#666' }} />
        <YAxis tick={{ fontSize: 10, fill: '#666' }} />
        <Tooltip />
        <Legend />
        {dataKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </div>
  );
  return renderChartToImage(chartElement, 600, 320);
}

// Horizontal Bar Chart for rankings
export async function renderHorizontalBarChart(
  data: ChartDataItem[],
  title: string
): Promise<string | null> {
  const chartElement = (
    <div style={{ width: 500, height: 300, padding: 20, backgroundColor: '#fff' }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#333', fontFamily: 'Arial, sans-serif' }}>
        {title}
      </h3>
      <BarChart width={460} height={250} data={data.slice(0, 10)} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#666' }} />
        <YAxis 
          type="category" 
          dataKey="name" 
          tick={{ fontSize: 10, fill: '#666' }}
          width={120}
        />
        <Tooltip />
        <Bar dataKey="value" fill="#228B22" radius={[0, 4, 4, 0]} />
      </BarChart>
    </div>
  );
  return renderChartToImage(chartElement, 500, 320);
}

// Summary Stats Card
export async function renderSummaryCard(
  stats: { label: string; value: string | number }[],
  title: string
): Promise<string | null> {
  const chartElement = (
    <div style={{ 
      width: 600, 
      height: 120, 
      padding: 20, 
      backgroundColor: '#f8f9fa',
      borderRadius: 8,
      border: '1px solid #e9ecef',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: 14, color: '#333' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {stats.slice(0, 5).map((stat, index) => (
          <div key={index} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#228B22' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  return renderChartToImage(chartElement, 600, 140);
}
