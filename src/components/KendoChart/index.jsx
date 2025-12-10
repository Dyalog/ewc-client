import { useAppData } from '../../hooks';

let kendoAvailable = false;
let Chart, ChartSeries, ChartSeriesItem;

try {
  await import("@progress/kendo-theme-default/dist/all.css");
  ({ Chart, ChartSeries, ChartSeriesItem } = await import("@progress/kendo-react-charts"));
  kendoAvailable = true;
} catch {
  // Kendo packages not installed
}

const KendoChart = ({ data }) => {
  if (!kendoAvailable) {
    throw new Error("KendoChart requires @progress/kendo-react-charts and @progress/kendo-theme-default packages to be installed");
  }

  const { Options, Posn, Series, Size, ChartType, Event } = data?.Properties;
  const { socket } = useAppData(); // TODO! callbacks to APL on interaction

  const chartDefaultV4Colors = [
    "#ff6358",
    "#ffd246",
    "#78d237",
    "#28b4c8",
    "#2d73f5",
    "#aa46be",
  ];

  return (
    <div style={{ position: 'absolute', top: Posn && Posn[0], left: Posn && Posn[1] }}>
      <Chart
        style={{ width: Size && Size[1], height: Size && Size[0] }}
        seriesColors={chartDefaultV4Colors}
        pannable
        zoomable
      >
        <ChartSeries>
          {
            Series.map((s, i) =>
              <ChartSeriesItem key={i} data={s.data} type="column" name={"series-" + i} />
            )
          }
        </ChartSeries>
      </Chart>
    </div>
  );
};

export default KendoChart;
