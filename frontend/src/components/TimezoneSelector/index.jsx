const TIMEZONES = Intl.supportedValuesOf("timeZone");

export default function TimezoneSelector({
  name = "timezone",
  defaultValue = null,
  disabled = false,
}) {
  const displayValue =
    defaultValue || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <select
      name={name}
      defaultValue={displayValue}
      disabled={disabled}
      className="border-none bg-theme-settings-input-bg w-full text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block p-2.5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {TIMEZONES.map((tz) => (
        <option key={tz} value={tz}>
          {tz}
        </option>
      ))}
    </select>
  );
}
