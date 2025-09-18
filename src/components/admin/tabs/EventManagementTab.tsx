import React, { useState, useEffect } from 'react';
import { useEvents, Event } from '../../../contexts/EventContext';
import { Edit, Trash2, Users } from 'lucide-react';
import SurveyFormModal from '../SurveyFormModal';
import AnnouncementModal from '../AnnouncementModal';
import ParticipantsModal from '../ParticipantsModal';
import { doc, updateDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';

const EventManagementTab: React.FC = () => {
  const { allItems, fetchAllItems, setAllItems, addAnnouncement, updateAnnouncement } = useEvents();
  const [activeEventSubTab, setActiveEventSubTab] = useState<'events' | 'surveys' | 'announcements'>('events');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Event | null>(null);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Event | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedEventForParticipants, setSelectedEventForParticipants] = useState<Event | null>(null);

  useEffect(() => {
    fetchAllItems();
  }, []);

  const handleEventFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedEvent(prev => {
      if (prev) {
        return { ...prev, [name]: value };
      }
      return prev;
    });
  };

  const handleSurveyFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedSurvey(prev => {
      if (prev) {
        return { ...prev, [name]: value };
      }
      return prev;
    });
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    try {
      const { id, ...eventData } = selectedEvent;

      const eventToSave = {
        ...eventData,
        date: new Date(eventData.date),
        name: eventData.title, // Map title to name
        description: eventData.content, // Map content to description
      };

      if (id) {
        const eventRef = doc(db, 'events', id);
        await updateDoc(eventRef, eventToSave);
        fetchAllItems();
        alert('Etkinlik başarıyla güncellendi!');
      } else {
        await addDoc(collection(db, 'events'), { ...eventToSave, type: 'event' });
        fetchAllItems();
        alert('Etkinlik başarıyla eklendi!');
      }
      setShowEventModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Etkinlik kaydedilirken bir hata oluştu.');
    }
  };

  const handleSurveySubmit = async (survey: Event) => {
    if (!survey) return;

    try {
      const { id, ...surveyData } = survey;

      if (id) {
        const surveyRef = doc(db, 'events', id);
        await updateDoc(surveyRef, {
          name: survey.title,
          content: survey.description,
          coverImage: survey.coverImage,
          date: survey.date,
          status: survey.status,
          surveyUrl: survey.surveyUrl,
          type: 'survey',
        });
        fetchAllItems();
        alert('Anket başarıyla güncellendi!');
      } else {
        const surveyRef = await addDoc(collection(db, 'events'), {
          name: survey.title,
          content: survey.description,
          coverImage: survey.coverImage,
          date: survey.date,
          status: survey.status,
          surveyUrl: survey.surveyUrl,
          type: 'survey',
        });
        setAllItems(prev => [...prev, { ...survey, name: survey.title, content: survey.description, type: 'survey', id: surveyRef.id }]);
        alert('Anket başarıyla eklendi!');
      }
      setShowSurveyModal(false);
      setSelectedSurvey(null);
    } catch (error) {
      console.error('Error saving survey:', error);
      alert('Anket kaydedilirken bir hata oluştu.');
    }
  };

  const handleAnnouncementSubmit = async (announcementData: any) => {
    if (!announcementData) return;

    try {
      const { id, ...dataToSave } = announcementData;

      if (id) {
        await updateAnnouncement(announcementData);
        setAllItems(prev => prev.map(ann => 
          ann.id === id 
            ? { ...ann, ...announcementData } 
            : ann
        ));
        alert('Duyuru başarıyla güncellendi!');
      } else {
        const newAnn = await addAnnouncement({ ...announcementData, type: 'announcement' });
        setAllItems(prev => [...prev, newAnn]);
        alert('Duyuru başarıyla eklendi!');
      }
      setShowAnnouncementModal(false);
      setSelectedAnnouncement(null);
    } catch (error) {
      console.error('Error saving announcement:', error);
      alert('Duyuru kaydedilirken bir hata oluştu.');
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm('Bu öğeyi silmek istediğinizden emin misiniz?')) return;

    try {
      await deleteDoc(doc(db, 'events', eventId));
      setAllItems(prev => prev.filter(event => event.id !== eventId));
      alert('Öğe başarıyla silindi.');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Öğe silinirken bir hata oluştu.');
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Etkinlik ve Anket Yönetimi</h2>
          <div className="mt-4 flex space-x-4 border-b">
            <button
              onClick={() => setActiveEventSubTab('events')}
              className={`py-2 px-4 text-sm font-medium ${activeEventSubTab === 'events' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Etkinlikler
            </button>
            <button
              onClick={() => setActiveEventSubTab('surveys')}
              className={`py-2 px-4 text-sm font-medium ${activeEventSubTab === 'surveys' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Anketler
            </button>
            <button
              onClick={() => setActiveEventSubTab('announcements')}
              className={`py-2 px-4 text-sm font-medium ${activeEventSubTab === 'announcements' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Duyurular
            </button>
          </div>
        </div>
        <div className="p-6">
          {activeEventSubTab === 'events' && (
            <div>
              <button
                onClick={() => {
                  setSelectedEvent({ id: '', title: '', content: '', date: new Date().toISOString().slice(0, 16), location: '', imageUrl: '', type: 'event' });
                  setShowEventModal(true);
                }}
                className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Yeni Etkinlik Ekle
              </button>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etkinlik Adı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allItems.filter(e => e.type === 'event').map(event => (
                      <tr key={event.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">{event.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowEventModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEventForParticipants(event);
                              setShowParticipantsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <Users className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
              </table>
              </div>
            </div>
          )}
          {activeEventSubTab === 'surveys' && (
            <div>
              <button
                onClick={() => {
                  setSelectedSurvey(null);
                  setShowSurveyModal(true);
                }}
                className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Yeni Anket Ekle
              </button>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anket Adı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allItems.filter(e => e.type === 'survey').map(survey => (
                      <tr key={survey.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{survey.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(survey.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">{survey.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedSurvey(survey);
                              setShowSurveyModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteEvent(survey.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
              </table>
              </div>
            </div>
          )}
          {activeEventSubTab === 'announcements' && (
            <div>
              <button
                onClick={() => {
                  setSelectedAnnouncement(null);
                  setShowAnnouncementModal(true);
                }}
                className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Yeni Duyuru Ekle
              </button>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duyuru Adı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allItems.filter(e => e.type === 'announcement').map(announcement => (
                      <tr key={announcement.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{announcement.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(announcement.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">{announcement.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setShowAnnouncementModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteEvent(announcement.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">{selectedEvent.id ? 'Etkinliği Düzenle' : 'Yeni Etkinlik Ekle'}</h2>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <input type="text" name="title" value={selectedEvent.title} onChange={handleEventFormChange} placeholder="Etkinlik Başlığı" className="w-full p-2 border rounded" />
              <textarea name="content" value={selectedEvent.content} onChange={handleEventFormChange} placeholder="Etkinlik Açıklaması" className="w-full p-2 border rounded"></textarea>
              <input type="datetime-local" name="date" value={selectedEvent.date} onChange={handleEventFormChange} className="w-full p-2 border rounded" />
              <input type="text" name="location" value={selectedEvent.location} onChange={handleEventFormChange} placeholder="Etkinlik Yeri" className="w-full p-2 border rounded" />
              <input type="text" name="imageUrl" value={selectedEvent.imageUrl} onChange={handleEventFormChange} placeholder="Görsel URL" className="w-full p-2 border rounded" />
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setShowEventModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">İptal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSurveyModal && (
        <SurveyFormModal
          isOpen={showSurveyModal}
          survey={selectedSurvey}
          onClose={() => setShowSurveyModal(false)}
          onSubmit={handleSurveySubmit}
        />
      )}

      {showAnnouncementModal && (
        <AnnouncementModal
          isOpen={showAnnouncementModal}
          announcement={selectedAnnouncement}
          onClose={() => setShowAnnouncementModal(false)}
          onSubmit={handleAnnouncementSubmit}
        />
      )}

      {showParticipantsModal && selectedEventForParticipants && (
        <ParticipantsModal
          isOpen={showParticipantsModal}
          onClose={() => setShowParticipantsModal(false)}
          event={selectedEventForParticipants}
        />
      )}
    </>
  );
};

export default EventManagementTab;
