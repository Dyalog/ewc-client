import { setStyle } from "../../utils";

const Link = ({data}) => {
    const style = setStyle(data.Properties)
    return (
        <div>
            <a 
                id={data.ID}
                href={data.Properties.Href}
                target={data.Properties?.Target || '_blank'} // Default to new tab/window
                download={data.Properties?.Download === 1}

                style={{
                    ...style
                }}
            >
                {data.Properties?.Label !== undefined ? data.Properties.Label : data.Properties.Href}
            </a>
        </div>
    );
};

export default Link;
