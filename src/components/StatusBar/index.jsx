import { excludeKeys } from "../../utils";
import StatusField from "../StatusField";

const StatusBar = ({ data }) => {
    const { Align = 'Bottom', Posn, Size } = data?.Properties;

    if (Align != 'Bottom') {
        console.error("StatusBar with Align other than Bottom is not supported yet.");
    }
    const styles = {
        position: 'absolute',
        display: 'flex',
        alignItems: 'left',
        padding: '0 8px',
        backgroundColor: '#f0f0f0',
        borderTop: '1px solid #ccc',
        bottom: Posn?.bottom || 0,
        left: 0,
        right: 0,
        height: Size?.height || '22px',
    };
    return (
        <div id={data?.ID} style={styles}>
            {Object.keys(excludeKeys(data)).map((key) => (
                <StatusField key={key} data={data[key]} />
            ))}
        </div>
    );
}

export default StatusBar;