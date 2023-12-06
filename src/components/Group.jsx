import { setStyle, excludeKeys } from '../utils';
import SelectComponent from './SelectComponent';

const Group = ({ data }) => {
  const styles = setStyle(data?.Properties);

  const { Visible } = data?.Properties;

  const updatedData = excludeKeys(data);

  return (
    <div
      style={{
        ...styles,
        border: '1px solid #F0F0F0',
        background: 'white',
        display: Visible == 0 ? 'none' : 'block',
      }}
    >
      {data?.Properties?.Caption && (
        <span
          style={{
            fontSize: '12px',
            position: 'relative',
            bottom: 10,
            left: 10,
            background: '#F1F1F1 ',
          }}
        >
          {data?.Properties?.Caption}
        </span>
      )}
      {Object.keys(updatedData).map((key) => (
        <SelectComponent data={updatedData[key]} />
      ))}
    </div>
  );
};

export default Group;
