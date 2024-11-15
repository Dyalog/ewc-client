import { isArray } from 'lodash';

const Header = ({ data }) => {
  if (isArray(data?.value)) {
    return (
      <div
        style={{
          backgroundColor: data?.backgroundColor,
          color: data?.color,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {data?.value.map((th, index) => {
          // if (th === '') return <br key={index} />;
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
