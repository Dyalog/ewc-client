import ReactApexChart from 'react-apexcharts';
import { useAppData } from '../../hooks';

const BarGraph = ({ data }) => {
  const { Options, Posn, Series, Size, ChartType, Event } = data?.Properties;
  const { socket } = useAppData();
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

  const sendEvent = (event, chartContext, config) => {
    const Event = JSON.stringify({
      Event: {
        ID: data?.ID,
        EventName: event,
        Info: [stringifyCircularJSON(chartContext), stringifyCircularJSON(config)],
      },
    });
    socket.send(Event);
  };

  // const options = {
  //   chart: {
  //     parentHeightOffset: 0,
  //     toolbar: { show: false },
  //   },
  //   plotOptions: {
  //     bar: {
  //       borderRadius: 6,
  //       borderRadiusApplication: 'end',
  //       distributed: true,
  //       columnWidth: '35%',
  //       startingShape: 'rounded',
  //       dataLabels: { position: 'top' },
  //     },
  //   },
  //   legend: { show: false },
  //   tooltip: { enabled: false },
  //   dataLabels: {
  //     offsetY: -15,
  //     // formatter: (val) => `${val}k`,
  //     style: {
  //       fontWeight: 600,
  //       fontSize: '1rem',
  //       colors: ['#4b465c'],
  //     },
  //   },
  //   grid: {
  //     show: false,
  //   },
  //   xaxis: {
  //     axisTicks: { show: false },
  //     axisBorder: {
  //       color: 'gray',
  //     },
  //     categories: Options?.xaxis.categories,
  //     labels: {
  //       style: {
  //         fontSize: '13px',
  //         colors: [1, 2].map(() => 'red'),
  //         fontWeight: 400,
  //         fontFamily: 'Poppins',
  //       },
  //     },
  //   },
  //   yaxis: {
  //     min: Options?.yMin,
  //     max: Options?.yMax,
  //     tickAmount: Options?.Intervals,
  //     labels: {
  //       offsetX: -15,
  //       style: {
  //         fontSize: '13px',
  //         fontWeight: 400,
  //         colors: ['#22292f80'],
  //         fontFamily: 'Poppins',
  //       },
  //     },
  //   },
  //   responsive: [
  //     {
  //       options: {
  //         plotOptions: {
  //           bar: { columnWidth: '60%' },
  //         },
  //         grid: {
  //           padding: { right: 20 },
  //         },
  //       },
  //     },
  //   ],
  // };

  const options = {
    ...Options,
    chart: {
      events: {
        ...(Event?.some((item) => item[0] === 'click') && {
          click: (chartContext, config) => sendEvent('click', chartContext, config),
        }),
        ...(Event?.some((item) => item[0] === 'legendclick') && {
          click: (chartContext, config) => sendEvent('click', chartContext, config),
        }),
      },
    },
  };
  return (
    <div style={{ position: 'absolute', top: Posn && Posn[0], left: Posn && Posn[1] }}>
      <ReactApexChart
        options={options}
        width={Size && Size[1]}
        height={Size && Size[0]}
        type={ChartType}
        series={Series}
      />
    </div>
  );
};

export default BarGraph;

// The event structure that I propose is
// {"Event":{"ID":"F1.CHART1","EventName":"<name of event>","Info":[<chartContext>,<config>]}}
