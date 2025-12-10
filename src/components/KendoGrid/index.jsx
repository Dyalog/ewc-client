import { useState } from "react";
import { pairsToObject } from "../../utils/pairsToObject";
import { getCurrentUrl } from "../../utils";

let kendoAvailable = false;
let filterBy, orderBy, Grid, GridColumn, Button;

try {
  ({ filterBy, orderBy } = await import("@progress/kendo-data-query"));
  ({ Grid, GridColumn } = await import("@progress/kendo-react-grid"));
  ({ Button } = await import("@progress/kendo-react-buttons"));
  await import("@progress/kendo-theme-default/dist/all.css");
  kendoAvailable = true;
} catch {
  // Kendo packages not installed
}

// ColTitles and Values must be indexed the same
const KendoGrid = ({ data }) => {
  if (!kendoAvailable) {
    throw new Error("KendoGrid requires @progress/kendo-react-grid, @progress/kendo-react-buttons, @progress/kendo-data-query, and @progress/kendo-theme-default packages to be installed");
  }

  const { ColTitles, Values, Posn, Options } = data?.Properties;

  const gridData = Values.map((row) => {
    let gd = {};
    ColTitles.forEach((ct, i) => (gd[ct] = row[i]));
    return gd;
  });

  const initialFilter = {
    logic: "and",
    filters: [],
  };
  const [filter, setFilter] = useState(initialFilter);

  const initialSort = [];
  const [sort, setSort] = useState(initialSort);

  const columnTypes = pairsToObject(Options.columnTypes);
  const filterableCols = pairsToObject(Options.filterableCols);
  const sortableCols = Options.sortableCols;

  const ImageCell = (props) => {
    if (!props.dataItem[props.field]) {
      return <td></td>;
    }
    return (
      <td>
        <img src={getCurrentUrl() + props.dataItem[props.field]} />
      </td>
    );
  };

  const ButtonCell = (props) => {
    return (
      <td>
        <Button onClick={() => alert(props.dataItem[props.field])}>
          {props.dataItem[props.field]}
        </Button>
      </td>
    );
  };

  const VideoCell = (props) => {
    const videoSrc = props.dataItem[props.field];
    if (!videoSrc) {
      return <td></td>;
    }
    return (
      <td>
        <video controls>
          <source src={getCurrentUrl() + videoSrc} type="video/mp4" />
        </video>
      </td>
    );
  };

  const cellComponents = {
    Image: ImageCell,
    Button: ButtonCell,
    Video: VideoCell,
  };

  return (
    <div
      style={{
        position: "absolute",
        top: Posn && Posn[0],
        left: Posn && Posn[1],
      }}
    >
      <Grid
        data={orderBy(filterBy(gridData, filter), sort)}
        navigatable={true}
        filterable={Options["filterable"] == 1}
        filter={filter}
        onFilterChange={(e) => setFilter(e.filter)}
        sortable={
          Options["sortable"] == 1
            ? {
                allowUnsort: true,
                mode: "multiple",
              }
            : undefined
        }
        sort={sort}
        onSortChange={(e) => setSort(e.sort)}
      >
        {ColTitles.map((ct, _) => {
          return (
            <GridColumn
              field={ct}
              title={ct}
              cells={{ data: cellComponents[columnTypes[ct]] }}
              filterable={filterableCols.hasOwnProperty(ct)}
              filter={
                filterableCols[ct] === "" ? undefined : filterableCols[ct]
              }
              sortable={sortableCols.includes(ct)}
            />
          );
        })}
      </Grid>
    </div>
  );
};

export default KendoGrid;
