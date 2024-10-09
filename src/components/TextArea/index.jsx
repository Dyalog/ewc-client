import { parseFlexStyles, setStyle } from '../../utils';
import './textArea.css';
import '../../styles/font.css';

const TextArea = ({ data }) => {
  let styles = setStyle(data?.Properties);

  const { Text, Font, CSS } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)

  let updatesStyles = {
    ...styles,
    scrollbarWidth: 'thin',
    scrollbarColor: 'transparent transparent',
    fontFamily: Font && Font[0],
    fontSize: Font && `${Font[1]}`,
    ...customStyles
  };

  return (
    <div style={{ overflow: 'hidden' }}>
      <textarea className='ewc-text-area' style={updatesStyles} defaultValue={Text} />
    </div>
  );
};

export default TextArea;
