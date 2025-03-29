import ReactApexChart from 'react-apexcharts';
import { useAppData } from '../../hooks';
import { parseFlexStyles, setStyle } from '../../utils';
import { useEffect, useRef, useState } from 'react';
import * as Globals from "./../../Globals";

const Chart = ({ data }) => {
  const { Options, Posn, Series, Size, ChartType, Event, CSS } = data?.Properties;

  const [chartSvg, setChartSvg] = useState(null);
  const { socket, handleData } = useAppData();
  const customStyles = parseFlexStyles(CSS)
  const styles = setStyle(data?.Properties);

  const stringifyCircularJSON = (obj) => {
    const seen = new WeakSet();
    return JSON.stringify(obj, (k, v) => {
      if (v !== null && typeof v === 'object') {
        if (seen.has(v)) return;
        seen.add(v);
      }
      return v;
    });
  };

  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      setTimeout(() => {
        const chartInstance = chartRef.current.chart.paper(); 
        const svg = chartInstance.svg();
        if (svg) {
          setChartSvg(svg);
          Globals.set(data.ID, JSON.stringify(svg));
          handleData(
            {
              ID: data?.ID,
              Properties: {
                SVG: svg,
              },
            },
            'WS'
          );
        }
      }, 500); 
    }
  }, [chartRef.current]);
  

  const sendEvent = (event, chartContext, config, chartConfig) => {
    const obj = {
      dataPointIndex: chartConfig?.dataPointIndex,
      seriesIndex: chartConfig?.seriesIndex,
      series: chartConfig?.config?.series,
      xaxis: chartConfig?.config?.xaxis,
      yaxis: chartConfig?.config?.yaxis,
    };

    const Event = JSON.stringify({
      Event: {
        ID: data?.ID,
        EventName: event,
        // Info: [stringifyCircularJSON(chartContext), stringifyCircularJSON(config)],
        Info: [JSON.stringify(obj)],
      },
    });
    console.log(Event);
    socket.send(Event);
  };
  
  console.log("chart",chartSvg)

  const options = {
    ...Options,
    chart: {
      events: {
        ...(Event?.some((item) => item[0] === 'click') && {
          click: (chartContext, config, chartConfig) =>
            sendEvent('click', chartContext, config, chartConfig),
        }),
        ...(Event?.some((item) => item[0] === 'legendclick') && {
          legendClick: (chartContext, config, chartConfig) =>
            sendEvent('legendclick', chartContext, config, chartConfig),
        }),
      },
    },
  };

  return (
    <div
      style={{
        position: "absolute",
        top: Posn && Posn[0],
        left: Posn && Posn[1],
        ...styles,
        ...customStyles,
      }}
    >
      <ReactApexChart
        ref={chartRef}
        options={options}
        width={Size && Size[1]}
        height={Size && Size[0]}
        type={ChartType}
        series={Series}
      />
    </div>
  );
};

export default Chart;
