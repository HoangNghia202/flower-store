export function GradientOrb({
    className,
    style,
}: {
    className: string;
    style?: React.CSSProperties;
}) {
    return (
        <div
            aria-hidden
            className={`absolute rounded-full blur-3xl pointer-events-none animate-orb-float ${className}`}
            style={style}
        />
    );
}
