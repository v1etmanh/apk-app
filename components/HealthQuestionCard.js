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
};

export default function HealthQuestionCard({ dishId, questions = [] }) {
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ask = async (question) => {
    setSelected(question.id);
    setAnswer(null);
    setError('');
    setLoading(true);
    try {
      const res = await api.post(`/api/v1/dishes/${dishId}/health-question`, {
        question_id: question.id,
        show_sources: false,
      });
      setAnswer(res.data);
    } catch (e) {
      setError('Chưa lấy được câu trả lời. Bạn thử lại sau nhé.');
    } finally {
      setLoading(false);
    }
  };

  if (!questions.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Hỏi đáp dinh dưỡng" icon="sparkles-outline" />
      <PaperCard priority="primary" innerStyle={styles.cardInner}>
        <View style={styles.intro}>
          <Text style={styles.mascot}>🐱</Text>
          <Text style={styles.introText}>Bấm một câu hỏi, mình xem nhanh chỉ số của món này nhé~</Text>
        </View>
        <View style={styles.questions}>
          {questions.map((question) => {
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
  state: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14 },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: C.textLight },
  error: { marginTop: 12, fontFamily: 'Nunito_400Regular', fontSize: 13, color: C.accentRed },
  answer: { marginTop: 14, padding: 13, borderRadius: 14, backgroundColor: `${GOLD}12`, borderLeftWidth: 3, borderLeftColor: GOLD, ...shadow(1) },
  answerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: C.text, marginBottom: 6 },
  answerText: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: C.textMid, lineHeight: 21 },
  metrics: { marginTop: 9, fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: C.primary, lineHeight: 17 },
  disclaimer: { marginTop: 9, fontFamily: 'Nunito_400Regular', fontSize: 11, color: C.textLight, lineHeight: 16 },
};
