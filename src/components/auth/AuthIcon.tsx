interface AuthIconProps {
  name: "user" | "mail" | "lock" | "eye" | "eyeOff";
}

function AuthIcon({ name }: AuthIconProps) {
  if (name === "user") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="7" r="3.5" />
        <path d="M5 21v-2.4c0-3.1 3.1-5.1 7-5.1s7 2 7 5.1V21H5Z" />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="10" width="14" height="11" rx="1.5" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        <path d="M12 14v3" />
      </svg>
    );
  }

  if (name === "eyeOff") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
        <path d="M9.8 5.3A10.5 10.5 0 0 1 12 5c5.2 0 8.5 4.2 9.5 6-.4.8-1.3 2.1-2.6 3.3M6.2 6.2C4.3 7.5 3.1 9.4 2.5 11c1 1.8 4.3 6 9.5 6 1 0 2-.2 2.8-.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  );
}

export default AuthIcon;
