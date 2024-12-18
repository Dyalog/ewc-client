import { isArray } from 'lodash';

const Header = ({ data }) => {
  if (isArray(data?.value)) {
    return (
      <div
        style={{
          backgroundColor: data?.backgroundColor,
          color: data?.color,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexDirection: 'column',
          height: '100%',
          paddingBottom:"5px"
        }}
      >
        {data?.value.map((th, index) => {
          if (th === '') return <br key={index} />;
          return <div key={index} style={{ lineHeight: '96%' }}>{th}</div>;
        })}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: data?.backgroundColor, color: data?.color }}>{data?.value}</div>
  );
};

export default Header;
