const StatusField = ({ data }) => {
    const { Caption, Text, Posn, Size } = data?.Properties;

    /*TODO:
    - fontobj
    - fcol
    - bcol
    */

    const styles = {
        padding: '0 16px 0 4px',
        borderRight: '1px solid #ccc',
        backgroundColor: '#f0f0f0',
    };
    return (
        <div id={data?.ID} style={styles}>
            {Caption}{Text}
        </div>
    );
}

export default StatusField;
