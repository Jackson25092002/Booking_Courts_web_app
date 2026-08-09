import { Link } from "react-router-dom";
import "./ComingSoonPage.css";

interface ComingSoonPageProps {
  eyebrow: string;
  title: string;
  description: string;
}

function ComingSoonPage({ eyebrow, title, description }: ComingSoonPageProps) {
  return (
    <div className="coming-soon-page">
      <section>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
        <div>
          <Link to="/courts">Tìm sân ngay</Link>
          <Link to="/">Về trang chủ</Link>
        </div>
      </section>
    </div>
  );
}

export default ComingSoonPage;
