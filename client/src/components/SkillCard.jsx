import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { CategoryIcon } from './Icon';
import { Avatar, LevelDots } from './ui';

export default function SkillCard({ skill, showOwner = true, actions }) {
  return (
    <article className={`skill-card ${skill.type === 'WANT' ? 'want' : 'offer'}`}>
      <div className="skill-card-top">
        <span className="chip">
          <CategoryIcon name={skill.category?.icon} size={14} /> {skill.category?.name}
        </span>
        <LevelDots level={skill.level} />
      </div>
      <h3>{skill.title}</h3>
      {skill.description && <p className="muted clamp">{skill.description}</p>}
      {showOwner && skill.user && (
        <Link to={`/members/${skill.user.id}`} className="owner">
          <Avatar name={skill.user.name} size={28} />
          <span>
            <strong>{skill.user.name}</strong>
            {skill.user.location && (
              <small>
                <MapPin size={12} aria-hidden="true" /> {skill.user.location}
              </small>
            )}
          </span>
        </Link>
      )}
      {actions && <div className="skill-card-actions">{actions}</div>}
    </article>
  );
}
