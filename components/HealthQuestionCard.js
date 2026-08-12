import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { C, shadow } from '../theme';
import PaperCard from './ui/PaperCard';
import SectionHeader from './ui/SectionHeader';

const GOLD = C.amber || '#F59E0B';

const ICONS = {
  nutrition: ['nutrition-outline', C.accentGreen],
  diabetes: ['water-outline', '#10B981'],
  hypertension: ['heart-outline', '#EF4444'],
  gout: ['medical-outline', '#6366F1'],
  ibs: ['leaf-outline', '#A855F7'],
  calories: ['flame-outline', '#F97316'],
  weight_loss: ['scale-outline', '#F59E0B'],
  energy_goal: ['flash-outline', '#84CC16'],
  satiety: ['restaurant-outline', '#A78BFA'],
  weather_fit: ['partly-sunny-outline', '#3B82F6'],
  allergy: ['warning-outline', '#EF4444'],
  diet_type: ['leaf-outline', '#22C55E'],
};

export default function HealthQuestionCard({ dishId, questions = [], primaryQuestions = [], moreQuestions = [], profile = null }) {
  const primary = primaryQuestions.length ? primaryQuestions : questions.slice(0, 4);
  const more = moreQuestions.length ? moreQuestions : questions.slice(4, 11);
  const allQuestions = [...primary, ...more];
  const [showMore, setShowMore] = useState(false);
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ask = async (question, showSources = false) => {
    setSelected(question.id);
    setAnswer(null);
    setError('');
    setLoading(true);
    try {
      const res = await api.post(`/api/v1/dishes/${dishId}/health-question`, {
        question_id: question.id,
        show_sources: showSources,
        profile: profile || {},
      });
      setAnswer(res.data);
    } catch (e) {
      setError('Chưa lấy được câu trả lời. Bạn thử lại sau nhé.');
    } finally {
      setLoading(false);
    }
  };

  if (!allQuestions.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Hỏi đáp dinh dưỡng" icon="sparkles-outline" />
      <PaperCard priority="primary" innerStyle={styles.cardInner}>
        <View style={styles.intro}>
          <Text style={styles.mascot}>🐱</Text>
          <Text style={styles.introText}>Bấm một câu hỏi, mình xem nhanh chỉ số của món này nhé~</Text>
        </View>
        <View style={styles.questions}>
          {(showMore ? allQuestions : primary).map((question) => {
            const [icon, color] = ICONS[question.icon] || ['help-circle-outline', C.accentBlue];
            const active = selected === question.id;
            return (
              <TouchableOpacity
                key={question.id}
                onPress={() => ask(question)}
                activeOpacity={0.78}
                style={[styles.question, active && { borderColor: color, backgroundColor: `${color}12` }]}
              >
                <Ionicons name={icon} size={18} color={color} />
                <Text style={styles.questionText}>{question.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textLight} />
              </TouchableOpacity>
            );
          })}
        </View>
        {more.length > 0 && (
          <TouchableOpacity onPress={() => setShowMore(value => !value)} style={styles.moreButton} activeOpacity={0.75}>
            <Text style={styles.moreButtonText}>{showMore ? 'Thu gọn câu hỏi' : `Xem thêm câu hỏi (${more.length})`}</Text>
            <Ionicons name={showMore ? 'chevron-up' : 'chevron-down'} size={16} color={C.primary} />
          </TouchableOpacity>
        )}
        {loading && (
          <View style={styles.state}>
            <ActivityIndicator color={C.primary} />
            <Text style={styles.stateText}>Mèo đầu bếp đang xem giúp bạn...</Text>
          </View>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!answer && !loading && (
          <View style={styles.answer}>
            <Text style={styles.answerTitle}>✨ {answer.question}</Text>
            <Text style={styles.answerText}>{answer.answer}</Text>
            {answer.metrics && Object.keys(answer.metrics).length > 0 && (
              <Text style={styles.metrics}>Số liệu đang dùng: {Object.entries(answer.metrics).map(([key, value]) => `${key}: ${value}`).join(' · ')}</Text>
            )}
            <Text style={styles.disclaimer}>{answer.disclaimer}</Text>
            {!answer.sources && (
              <TouchableOpacity onPress={() => {
                const currentQuestion = allQuestions.find(item => item.id === answer.question_id);
                if (currentQuestion) ask(currentQuestion, true);
              }} style={styles.sourcesButton}>
                <Ionicons name="book-outline" size={14} color={C.primary} />
                <Text style={styles.sourcesButtonText}>Xem nguồn tham khảo</Text>
              </TouchableOpacity>
            )}
            {Array.isArray(answer.sources) && answer.sources.length > 0 && (
              <View style={styles.sources}>
                <Text style={styles.sourcesTitle}>Nguồn tham khảo</Text>
                {answer.sources.map((source) => (
                  <Text key={source.source_id} style={styles.sourceText}>• {source.title || source.source_id}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </PaperCard>
    </View>
  );
}

const styles = {
  section: { marginBottom: 24 },
  cardInner: { padding: 16 },
  intro: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mascot: { fontSize: 25, marginRight: 8 },
  introText: { flex: 1, fontFamily: 'Nunito_400Regular', fontSize: 14, color: C.textMid, lineHeight: 20 },
  questions: { gap: 8 },
  question: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: C.borderLight, backgroundColor: 'rgba(255,255,255,0.5)' },
  questionText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.text },
  moreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
  moreButtonText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: C.primary },
  state: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14 },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: C.textLight },
  error: { marginTop: 12, fontFamily: 'Nunito_400Regular', fontSize: 13, color: C.accentRed },
  answer: { marginTop: 14, padding: 13, borderRadius: 14, backgroundColor: `${GOLD}12`, borderLeftWidth: 3, borderLeftColor: GOLD, ...shadow(1) },
  answerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: C.text, marginBottom: 6 },
  answerText: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: C.textMid, lineHeight: 21 },
  metrics: { marginTop: 9, fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: C.primary, lineHeight: 17 },
  disclaimer: { marginTop: 9, fontFamily: 'Nunito_400Regular', fontSize: 11, color: C.textLight, lineHeight: 16 },
  sourcesButton: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4 },
  sourcesButtonText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: C.primary },
  sources: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: `${GOLD}40` },
  sourcesTitle: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: C.primary, marginBottom: 4 },
  sourceText: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: C.textLight, lineHeight: 17 },
};
