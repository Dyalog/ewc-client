import Form from './Form';
import MenuBar from './MenuBar';
import Menu from './Menu';
import Grid from './Grid';
import Edit from './Edit';
import Button from './Button';
import Combo from './Combo';
import Label from './Label';
import Treeview from './Treeview';
import List from './List';
import Splitter from './Splitter';
import Group from './Group';
import ScrollBar from './ScrollBar';
import TabControl from './TabControl';
import TabButton from './TabButton';
import SubForm from './SubForm';
import TextArea from './TextArea';

const SelectComponent = ({ data, inputValue = '', event = '', row = '', column = '' }) => {
  if (data?.Properties?.Type == 'Form') return <Form data={data} />;
  if (data?.Properties?.Type == 'MenuBar')
    return (
      <div
        style={{
          position: 'absolute',
          translate: '0% -100%',
          zIndex: '99999',
        }}
      >
        <MenuBar data={data} />
      </div>
    );
  if (data?.Properties?.Type == 'Menu') return <Menu data={data} />;
  if (data?.Properties?.Type == 'Grid') return <Grid data={data} />;
  if (data?.Properties?.Type == 'Edit' && data?.Properties?.Style !== 'Multi')
    return (
      <div
        style={{
          textAlign: data?.Properties?.FieldType == 'Numeric' ? 'right' : 'null',
          marginLeft: '10px',
        }}
      >
        <Edit data={data} value={inputValue} event={event} row={row} column={column} />
      </div>
    );
  if (data?.Properties?.Type == 'Button')
    return <Button data={data} inputValue={inputValue} event={event} row={row} column={column} />;
  if (data?.Properties?.Type == 'Combo')
    return <Combo data={data} value={inputValue} event={event} row={row} column={column} />;
  if (data?.Properties?.Type == 'Label') return <Label data={data} />;
  if (data?.Properties?.Type == 'TreeView') return <Treeview data={data} />;
  if (data?.Properties?.Type == 'SubForm' && data?.Properties.hasOwnProperty('TabObj'))
    return <SubForm data={data} />;
  if (data?.Properties?.Type == 'List') return <List data={data} />;
  if (data?.Properties?.Type == 'Splitter') return <Splitter data={data} />;
  if (data?.Properties?.Type == 'Group') return <Group data={data} />;
  if (data?.Properties?.Type == 'Scroll') return <ScrollBar data={data} />;
  if (data?.Properties?.Type == 'TabControl') return <TabControl data={data} />;
  if (data?.Properties?.Type == 'TabButton') return <TabButton data={data} />;
  if (data?.Properties?.Type == 'Edit' && data?.Properties?.Style == 'Multi') {
    return <TextArea data={data} />;
  }
};

export default SelectComponent;
