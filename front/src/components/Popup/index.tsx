import { PropsWithChildren } from "react";

interface Props {
    visible: boolean;
    className?: string;
}
export function Popup({ children, className, visible }: PropsWithChildren<Props>) {
    if (!visible) {
        return <></>
    }

    return <div className={className}>
        {children}
    </div>
}