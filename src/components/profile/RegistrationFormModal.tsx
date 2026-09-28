import React, { useState } from 'react';
import type { RegistrationData } from '../../types/user';
import { triggerHaptic } from '../../lib/maxBridge';
import { X, Check, FileText, Phone, Mail, User, Calendar } from 'lucide-react';
import './ProfileScreen.css';

interface RegistrationFormModalProps {
  initialData: RegistrationData;
  onSave: (data: RegistrationData) => void;
  onClose: () => void;
}

export const RegistrationFormModal: React.FC<RegistrationFormModalProps> = ({
  initialData,
  onSave,
  onClose,
}) => {
  const [fullName, setFullName] = useState(initialData.fullName || '');
  const [birthDate, setBirthDate] = useState(initialData.birthDate || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [email, setEmail] = useState(initialData.email || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    onSave({
      fullName: fullName.trim(),
      birthDate,
      phone: phone.trim(),
      email: email.trim(),
    });
    onClose();
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <div className="modal-title-with-icon">
            <FileText size={20} className="icon-blue" />
            <h3>Данные для регистрации</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="modal-hint">
          Эти данные будут автоматически подставляться в формы записи на закрытые выставки, лекции и мастер-классы.
        </p>

        <form onSubmit={handleSubmit} className="reg-form">
          <div className="form-group">
            <label>
              <User size={14} /> ФИО участника
            </label>
            <input
              type="text"
              className="max-input"
              placeholder="Иванов Иван Иванович"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Calendar size={14} /> Дата рождения
            </label>
            <input
              type="date"
              className="max-input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>
              <Phone size={14} /> Номер телефона
            </label>
            <input
              type="tel"
              className="max-input"
              placeholder="+7 (999) 000-00-00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Mail size={14} /> Электронная почта (email)
            </label>
            <input
              type="email"
              className="max-input"
              placeholder="name@example.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-save-profile">
            <Check size={18} />
            <span>Сохранить данные</span>
          </button>
        </form>
      </div>
    </div>
  );
};
